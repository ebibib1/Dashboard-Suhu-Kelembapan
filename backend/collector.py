#!/usr/bin/env python3
"""
Python Collector - Reads Modbus sensors and sends data to backend API.
This replaces the old logger.py and sensor_reader.py with a more generic approach.
"""

import os
import sys
import time
import logging
import httpx
from datetime import datetime
from typing import List, Optional

# Add current directory to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Add IoT directory for existing sensor config/reader
IOT_DIR = os.path.join(CURRENT_DIR, "..", "IoT")
if IOT_DIR not in sys.path:
    sys.path.insert(0, IOT_DIR)

from config import get_settings
from database import SessionLocal, init_db
from models import Connection, Device, DataPoint, ConnectionProtocol
from modbus_service import read_device_data
from schemas import CollectorDataIn

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

BACKEND_URL = f"http://{settings.BACKEND_HOST}:{settings.BACKEND_PORT}"
COLLECTOR_ENDPOINT = f"{BACKEND_URL}/api/collector/data"


class Collector:
    def __init__(self):
        self.running = False
        self.client = httpx.Client(timeout=30.0)
    
    def get_active_devices(self) -> List[tuple]:
        """Get all active devices with their connections and data points."""
        db = SessionLocal()
        try:
            devices = db.query(Device).filter(Device.is_active == True).all()
            result = []
            for device in devices:
                connection = db.query(Connection).filter(
                    Connection.id == device.connection_id,
                    Connection.is_active == True
                ).first()
                if not connection:
                    logger.warning(f"No active connection for device {device.name}")
                    continue
                
                data_points = db.query(DataPoint).filter(
                    DataPoint.device_id == device.id,
                    DataPoint.enabled == True
                ).all()
                
                if not data_points:
                    logger.warning(f"No enabled data points for device {device.name}")
                    continue
                
                result.append((device, connection, data_points))
            return result
        finally:
            db.close()
    
    def send_to_backend(self, data: CollectorDataIn) -> bool:
        """Send collector data to backend API."""
        try:
            # Convert to dict for JSON serialization
            payload = data.model_dump()
            payload["timestamp"] = payload["timestamp"].isoformat()
            
            response = self.client.post(COLLECTOR_ENDPOINT, json=payload)
            response.raise_for_status()
            return True
        except httpx.RequestError as e:
            logger.error(f"Network error sending to backend: {e}")
            return False
        except httpx.HTTPStatusError as e:
            logger.error(f"Backend error: {e.response.status_code} - {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending to backend: {e}")
            return False
    
    def poll_once(self):
        """Poll all devices once and send data to backend."""
        devices_data = self.get_active_devices()
        
        if not devices_data:
            logger.debug("No active devices configured")
            return
        
        for device, connection, data_points in devices_data:
            try:
                logger.debug(f"Polling device: {device.name}")
                collector_data = read_device_data(connection, device, data_points)
                success = self.send_to_backend(collector_data)
                
                if success:
                    logger.debug(f"Data sent for {device.name}: {len(collector_data.readings)} readings")
                else:
                    logger.warning(f"Failed to send data for {device.name}")
                    
            except Exception as e:
                logger.error(f"Error polling device {device.name}: {e}")
    
    def run(self, interval: int = None):
        """Run collector loop."""
        if interval is None:
            interval = settings.COLLECTOR_POLL_INTERVAL
        
        self.running = True
        logger.info(f"Collector started with {interval}s interval")
        
        try:
            while self.running:
                start_time = time.time()
                self.poll_once()
                elapsed = time.time() - start_time
                sleep_time = max(0, interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)
        except KeyboardInterrupt:
            logger.info("Collector stopped by user")
        finally:
            self.running = False
            self.client.close()
    
    def stop(self):
        self.running = False


def test_connection(connection: Connection) -> bool:
    """Test a Modbus connection."""
    from modbus_service import test_connection as test_modbus
    success, message, _ = test_modbus(connection)
    logger.info(f"Connection test: {message}")
    return success


def setup_default_config():
    """Set up default configuration if database is empty."""
    db = SessionLocal()
    try:
        # Check if we have any connections
        conn_count = db.query(Connection).count()
        if conn_count > 0:
            return
        
        logger.info("Setting up default configuration...")
        
        # Create default connection
        connection = Connection(
            name="Default Modbus TCP",
            protocol=ConnectionProtocol.TCP,
            host=settings.DEFAULT_MODBUS_HOST,
            port=settings.DEFAULT_MODBUS_PORT,
            slave_id=settings.DEFAULT_SLAVE_ID,
            timeout_ms=int(settings.DEFAULT_MODBUS_TIMEOUT * 1000),
            is_active=True,
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
        
        # Create default device
        device = Device(
            connection_id=connection.id,
            name="XY-MD02 Sensor",
            slave_id=settings.DEFAULT_SLAVE_ID,
            description="Temperature and Humidity sensor",
            is_active=True,
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        
        # Create data points for temperature and humidity
        temp_point = DataPoint(
            device_id=device.id,
            name="Temperature",
            function_code=4,  # READ_INPUT_REGISTERS
            address=settings.DEFAULT_START_ADDRESS,
            register_count=1,
            data_type="int16",
            byte_order="big",
            word_order="big",
            scale=0.1,
            offset=0.0,
            unit="°C",
            enabled=True,
        )
        
        hum_point = DataPoint(
            device_id=device.id,
            name="Humidity",
            function_code=4,
            address=settings.DEFAULT_START_ADDRESS + 1,
            register_count=1,
            data_type="uint16",
            byte_order="big",
            word_order="big",
            scale=0.1,
            offset=0.0,
            unit="%RH",
            enabled=True,
        )
        
        db.add(temp_point)
        db.add(hum_point)
        db.commit()
        
        logger.info("Default configuration created")
        
    finally:
        db.close()


def main():
    """Main entry point."""
    logger.info("=" * 50)
    logger.info("IoT Sensor Collector")
    logger.info("=" * 50)
    
    # Initialize database
    init_db()
    
    # Set up default config if needed
    setup_default_config()
    
    # Run collector
    collector = Collector()
    
    # Allow interval override via environment
    interval = int(os.getenv("COLLECTOR_POLL_INTERVAL", settings.COLLECTOR_POLL_INTERVAL))
    
    try:
        collector.run(interval)
    except Exception as e:
        logger.error(f"Collector error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()