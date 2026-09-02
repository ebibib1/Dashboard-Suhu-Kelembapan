from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import SchedulerConfig
from schemas import SchedulerConfigResponse, SchedulerConfigUpdate
from scheduler_service import update_scheduler_intervals

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


@router.get("", response_model=SchedulerConfigResponse)
def get_scheduler_config(db: Session = Depends(get_db)):
    """Get current scheduler configuration."""
    config = db.query(SchedulerConfig).first()
    if not config:
        config = SchedulerConfig(
            poll_interval_seconds=5,
            log_interval_seconds=30,
            is_running=True,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("", response_model=SchedulerConfigResponse)
def update_scheduler_config(
    config_update: SchedulerConfigUpdate,
    db: Session = Depends(get_db),
):
    """Update scheduler configuration and apply changes immediately to the running scheduler."""
    update_data = config_update.model_dump(exclude_unset=True)
    config = update_scheduler_intervals(
        poll_interval=update_data.get("poll_interval_seconds"),
        log_interval=update_data.get("log_interval_seconds"),
        is_running=update_data.get("is_running"),
    )
    return config