from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Device, Connection
from schemas import DeviceCreate, DeviceUpdate, DeviceResponse

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=List[DeviceResponse])
def list_devices(connection_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Device)
    if connection_id:
        query = query.filter(Device.connection_id == connection_id)
    return query.order_by(Device.created_at.desc()).all()


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    conn = db.query(Connection).filter(Connection.id == device.connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    db_device = Device(**device.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: int, db: Session = Depends(get_db)):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    return db_device


@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, device: DeviceUpdate, db: Session = Depends(get_db)):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = device.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_device, field, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(device_id: int, db: Session = Depends(get_db)):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db.delete(db_device)
    db.commit()