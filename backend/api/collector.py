from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import SensorReading, RawLog, Device, DataPoint
from schemas import CollectorDataIn
from datetime import datetime
import json
from websocket_manager import manager

router = APIRouter(prefix="/api/collector", tags=["collector"])


@router.post("/data", status_code=status.HTTP_201_CREATED)
async def receive_sensor_data(data: CollectorDataIn, db: Session = Depends(get_db)):
    """Receive sensor data from Python collector."""
    # Validate device exists
    device = db.query(Device).filter(Device.id == data.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Save sensor readings
    for reading in data.readings:
        dp = db.query(DataPoint).filter(DataPoint.id == reading["data_point_id"]).first()
        if not dp:
            continue
        
        sensor_reading = SensorReading(
            device_id=data.device_id,
            data_point_id=reading["data_point_id"],
            value=reading["value"],
            raw_value=reading["raw_value"],
            timestamp=data.timestamp,
        )
        db.add(sensor_reading)
    
    # Save raw log
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