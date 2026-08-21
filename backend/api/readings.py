from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from database import get_db
from models import SensorReading, RawLog, DataPoint, Device
from schemas import SensorReadingResponse, CurrentReadingResponse, RawLogResponse

router = APIRouter(prefix="/api/readings", tags=["readings"])


@router.get("/current", response_model=List[CurrentReadingResponse])
def get_current_readings(device_id: int = None, db: Session = Depends(get_db)):
    """Get latest reading for each data point."""
    query = db.query(
        SensorReading.data_point_id,
        func.max(SensorReading.timestamp).label('max_ts')
    )
    
    if device_id:
        query = query.join(DataPoint).filter(DataPoint.device_id == device_id)
    
    latest_timestamps = query.group_by(SensorReading.data_point_id).subquery()
    
    readings = db.query(SensorReading, DataPoint.name, DataPoint.unit).join(
        latest_timestamps,
        (SensorReading.data_point_id == latest_timestamps.c.data_point_id) &
        (SensorReading.timestamp == latest_timestamps.c.max_ts)
    ).join(DataPoint).all()
    
    return [
        CurrentReadingResponse(
            data_point_id=r.SensorReading.data_point_id,
            name=r.name,
            value=r.SensorReading.value,
            unit=r.unit,
            timestamp=r.SensorReading.timestamp
        )
        for r in readings
    ]


@router.get("/device/{device_id}/current", response_model=List[CurrentReadingResponse])
def get_device_current_readings(device_id: int, db: Session = Depends(get_db)):
    """Get latest reading for each data point of a specific device."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    data_points = db.query(DataPoint).filter(
        DataPoint.device_id == device_id,
        DataPoint.enabled == True
    ).all()
    
    result = []
    for dp in data_points:
        latest = db.query(SensorReading).filter(
            SensorReading.data_point_id == dp.id
        ).order_by(desc(SensorReading.timestamp)).first()
        
        if latest:
            result.append(CurrentReadingResponse(
                data_point_id=dp.id,
                name=dp.name,
                value=latest.value,
                unit=dp.unit,
                timestamp=latest.timestamp
            ))
    
    return result


@router.get("/device/{device_id}/history", response_model=List[SensorReadingResponse])
def get_device_history(
    device_id: int,
    data_point_id: int = None,
    start: datetime = None,
    end: datetime = None,
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db)
):
    """Get historical readings for a device."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    query = db.query(SensorReading).join(DataPoint).filter(DataPoint.device_id == device_id)
    
    if data_point_id:
        query = query.filter(SensorReading.data_point_id == data_point_id)
    
    if start:
        query = query.filter(SensorReading.timestamp >= start)
    
    if end:
        query = query.filter(SensorReading.timestamp <= end)
    
    return query.order_by(desc(SensorReading.timestamp)).limit(limit).all()


@router.get("/raw-logs", response_model=List[RawLogResponse])
def get_raw_logs(
    device_id: int = None,
    connection_id: int = None,
    start: datetime = None,
    end: datetime = None,
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db)
):
    """Get raw Modbus logs."""
    query = db.query(RawLog)
    
    if device_id:
        query = query.filter(RawLog.device_id == device_id)
    
    if connection_id:
        query = query.filter(RawLog.connection_id == connection_id)
    
    if start:
        query = query.filter(RawLog.timestamp >= start)
    
    if end:
        query = query.filter(RawLog.timestamp <= end)
    
    return query.order_by(desc(RawLog.timestamp)).limit(limit).all()