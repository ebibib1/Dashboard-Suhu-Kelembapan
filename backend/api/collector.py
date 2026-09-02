from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import SensorReading, RawLog, Device, DataPoint, SchedulerConfig
from schemas import CollectorDataIn
from datetime import datetime
import json
from websocket_manager import manager

router = APIRouter(prefix="/api/collector", tags=["collector"])

# In-memory cache to throttle database logging
# Keys: data_point_id/device_id -> datetime of last write
last_log_times = {}
last_raw_log_times = {}


@router.post("/data", status_code=status.HTTP_201_CREATED)
async def receive_sensor_data(data: CollectorDataIn, db: Session = Depends(get_db)):
    """Receive sensor data from Python collector."""
    # Validate device exists
    device = db.query(Device).filter(Device.id == data.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Get logging interval from database configuration
    config = db.query(SchedulerConfig).first()
    log_interval = config.log_interval_seconds if config else 30
    
    should_commit = False
    
    # Save sensor readings based on log_interval throttling
    for reading in data.readings:
        dp = db.query(DataPoint).filter(DataPoint.id == reading["data_point_id"]).first()
        if not dp:
            continue
        
        last_log = last_log_times.get(dp.id)
        # Check if enough time has passed since last write, or if it has never been logged
        if last_log is None or (data.timestamp - last_log).total_seconds() >= log_interval:
            sensor_reading = SensorReading(
                device_id=data.device_id,
                data_point_id=reading["data_point_id"],
                value=reading["value"],
                raw_value=reading["raw_value"],
                timestamp=data.timestamp,
            )
            db.add(sensor_reading)
            last_log_times[dp.id] = data.timestamp
            should_commit = True
    
    # Save raw log based on log_interval throttling OR immediately if status is not OK (e.g. error/warning)
    last_raw_log = last_raw_log_times.get(data.device_id)
    is_error = data.status != "OK"
    if is_error or last_raw_log is None or (data.timestamp - last_raw_log).total_seconds() >= log_interval:
        raw_log = RawLog(
            device_id=data.device_id,
            connection_id=data.connection_id,
            timestamp=data.timestamp,
            slave_id=device.slave_id,
            function_code=data.function_code,
            address=data.address,
            registers=data.raw_registers,
            status=data.status,
            error=data.error,
        )
        db.add(raw_log)
        last_raw_log_times[data.device_id] = data.timestamp
        should_commit = True
        
    if should_commit:
        db.commit()
    
    # Broadcast to WebSocket clients
    current_readings = []
    for reading in data.readings:
        dp = db.query(DataPoint).filter(DataPoint.id == reading["data_point_id"]).first()
        if dp:
            current_readings.append({
                "data_point_id": dp.id,
                "name": dp.name,
                "value": reading["value"],
                "unit": dp.unit,
                "timestamp": data.timestamp.isoformat(),
            })
    
    await manager.broadcast({
        "type": "sensor_data",
        "device_id": data.device_id,
        "device_name": device.name,
        "timestamp": data.timestamp.isoformat(),
        "readings": current_readings,
        "status": data.status,
        "error": data.error,
    })
    
    return {"ok": True}