from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import DataPoint, Device
from schemas import DataPointCreate, DataPointUpdate, DataPointResponse

router = APIRouter(prefix="/api/data-points", tags=["data-points"])


@router.get("", response_model=List[DataPointResponse])
def list_data_points(device_id: int = None, db: Session = Depends(get_db)):
    query = db.query(DataPoint)
    if device_id:
        query = query.filter(DataPoint.device_id == device_id)
    return query.order_by(DataPoint.created_at.desc()).all()


@router.post("", response_model=DataPointResponse, status_code=status.HTTP_201_CREATED)
def create_data_point(dp: DataPointCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == dp.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db_dp = DataPoint(**dp.model_dump())
    db.add(db_dp)
    db.commit()
    db.refresh(db_dp)
    return db_dp


@router.get("/{dp_id}", response_model=DataPointResponse)
def get_data_point(dp_id: int, db: Session = Depends(get_db)):
    db_dp = db.query(DataPoint).filter(DataPoint.id == dp_id).first()
    if not db_dp:
        raise HTTPException(status_code=404, detail="Data point not found")
    return db_dp


@router.put("/{dp_id}", response_model=DataPointResponse)
def update_data_point(dp_id: int, dp: DataPointUpdate, db: Session = Depends(get_db)):
    db_dp = db.query(DataPoint).filter(DataPoint.id == dp_id).first()
    if not db_dp:
        raise HTTPException(status_code=404, detail="Data point not found")
    
    update_data = dp.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_dp, field, value)
    
    db.commit()
    db.refresh(db_dp)
    return db_dp


@router.delete("/{dp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_data_point(dp_id: int, db: Session = Depends(get_db)):
    db_dp = db.query(DataPoint).filter(DataPoint.id == dp_id).first()
    if not db_dp:
        raise HTTPException(status_code=404, detail="Data point not found")
    
    db.delete(db_dp)
    db.commit()