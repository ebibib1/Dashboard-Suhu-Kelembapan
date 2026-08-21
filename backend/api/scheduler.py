from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SchedulerConfig
from schemas import SchedulerConfigResponse, SchedulerConfigUpdate

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


@router.get("", response_model=SchedulerConfigResponse)
def get_scheduler_config(db: Session = Depends(get_db)):
    config = db.query(SchedulerConfig).first()
    if not config:
        config = SchedulerConfig(
            poll_interval_seconds=1,
            log_interval_seconds=30,
            is_running=False
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("", response_model=SchedulerConfigResponse)
def update_scheduler_config(config_update: SchedulerConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(SchedulerConfig).first()
    if not config:
        config = SchedulerConfig(
            poll_interval_seconds=1,
            log_interval_seconds=30,
            is_running=False
        )
        db.add(config)
    
    update_data = config_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    return config