"""
Seed script: Creates default Connection, Device (XY-MD02),
and two DataPoints (Temperature + Humidity) if they don't exist.
Run from: backend/ directory
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, init_db
from models import Connection, Device, DataPoint, ConnectionProtocol

init_db()
db = SessionLocal()

try:
    conn_count = db.query(Connection).count()
    if conn_count > 0:
        print(f"Already have {conn_count} connection(s). Skipping seed.")
        conns = db.query(Connection).all()
        for c in conns:
            print(f"  Connection: id={c.id} name={c.name} host={c.host}:{c.port}")
        devs = db.query(Device).all()
        for d in devs:
            print(f"  Device: id={d.id} name={d.name} slave_id={d.slave_id}")
        dps = db.query(DataPoint).all()
        for dp in dps:
            print(f"  DataPoint: id={dp.id} name={dp.name} address={dp.address} unit={dp.unit}")
    else:
        print("No connections found. Creating default config...")

        # Read host from .env or use default
        host = os.getenv("DEFAULT_MODBUS_HOST", "192.168.0.7")
        port = int(os.getenv("DEFAULT_MODBUS_PORT", "502"))
        slave_id = int(os.getenv("DEFAULT_SLAVE_ID", "1"))
        start_addr = int(os.getenv("DEFAULT_START_ADDRESS", "1"))

        connection = Connection(
            name="Default Modbus TCP",
            protocol=ConnectionProtocol.TCP,
            host=host,
            port=port,
            slave_id=slave_id,
            timeout_ms=3000,
            is_active=True,
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
        print(f"Created connection: {connection.name} @ {host}:{port}")

        device = Device(
            connection_id=connection.id,
            name="XY-MD02 Sensor",
            slave_id=slave_id,
            description="Temperature and Humidity Sensor (Modbus RTU/TCP)",
            is_active=True,
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        print(f"Created device: {device.name} (slave_id={slave_id})")

        temp_dp = DataPoint(
            device_id=device.id,
            name="Temperature",
            function_code=4,    # READ_INPUT_REGISTERS
            address=start_addr,
            register_count=1,
            data_type="int16",
            byte_order="big",
            word_order="big",
            scale=0.1,
            offset=0.0,
            unit="°C",
            enabled=True,
        )
        hum_dp = DataPoint(
            device_id=device.id,
            name="Humidity",
            function_code=4,
            address=start_addr + 1,
            register_count=1,
            data_type="int16",
            byte_order="big",
            word_order="big",
            scale=0.1,
            offset=0.0,
            unit="%RH",
            enabled=True,
        )
        db.add(temp_dp)
        db.add(hum_dp)
        db.commit()
        print(f"Created DataPoint: Temperature @ address {start_addr}")
        print(f"Created DataPoint: Humidity @ address {start_addr + 1}")
        print("\n✅ Default config seeded successfully!")
        print(f"   Sensor target: {host}:{port} (slave_id={slave_id})")
        print("   Update connection settings via UI if needed.")

finally:
    db.close()
