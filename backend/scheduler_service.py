import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Device, DataPoint, Connection, SchedulerConfig
from modbus_service import read_device_data
from api.collector import receive_sensor_data
import asyncio

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def get_active_devices_with_data_points(db: Session):
    """Get all active devices with their enabled data points and connections."""
    devices = db.query(Device).filter(Device.is_active == True).all()
    result = []
    for device in devices:
        connection = db.query(Connection).filter(
            Connection.id == device.connection_id,
            Connection.is_active == True
        ).first()
        if not connection:
            continue
        
        data_points = db.query(DataPoint).filter(
            DataPoint.device_id == device.id,
            DataPoint.enabled == True
        ).all()
        
        if not data_points:
            continue
        
        result.append((device, connection, data_points))
    
    return result


async def poll_job():
    """Poll all active devices and send data to collector endpoint."""
    db = SessionLocal()
    try:
        devices_data = get_active_devices_with_data_points(db)
        
        for device, connection, data_points in devices_data:
            try:
                logger.debug(f"Polling device: {device.name}")
                collector_data = read_device_data(connection, device, data_points)
                
                # Send to collector endpoint (internal)
                await receive_sensor_data(collector_data, db)
                
            except Exception as e:
                logger.error(f"Error polling device {device.name}: {e}")
    finally:
        db.close()


async def log_job():
    """Log job - historical logging is handled in collector endpoint.
    This can be used for aggregation or separate logging if needed."""
    logger.debug("Historical log job triggered (handled in collector)")


def start_scheduler():
    """Start the scheduler with configured intervals."""
    db = SessionLocal()
    try:
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
        
        if config.is_running:
            # Add poll job
            scheduler.add_job(
                poll_job,
                IntervalTrigger(seconds=config.poll_interval_seconds),
                id="poll_job",
                replace_existing=True,
                max_instances=1,
            )
            
            # Add log job
            scheduler.add_job(
                log_job,
                IntervalTrigger(seconds=config.log_interval_seconds),
                id="log_job",
                replace_existing=True,
                max_instances=1,
            )
            
            scheduler.start()
            logger.info(f"Scheduler started: poll={config.poll_interval_seconds}s, log={config.log_interval_seconds}s")
    finally:
        db.close()


def stop_scheduler():
    """Stop the scheduler."""
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")


def update_scheduler_intervals(poll_interval: int = None, log_interval: int = None, is_running: bool = None):
    """Update scheduler intervals."""
    db = SessionLocal()
    try:
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
        
        if poll_interval is not None:
            config.poll_interval_seconds = poll_interval
        if log_interval is not None:
            config.log_interval_seconds = log_interval
        if is_running is not None:
            config.is_running = is_running
        
        db.commit()
        
        if config.is_running:
            # Update jobs
            scheduler.add_job(
                poll_job,
                IntervalTrigger(seconds=config.poll_interval_seconds),
                id="poll_job",
                replace_existing=True,
                max_instances=1,
            )
            scheduler.add_job(
                log_job,
                IntervalTrigger(seconds=config.log_interval_seconds),
                id="log_job",
                replace_existing=True,
                max_instances=1,
            )
            if not scheduler.running:
                scheduler.start()
        else:
            scheduler.remove_job("poll_job")
            scheduler.remove_job("log_job")
            if scheduler.running and len(scheduler.get_jobs()) == 0:
                scheduler.shutdown(wait=False)
        
        logger.info(f"Scheduler updated: poll={config.poll_interval_seconds}s, log={config.log_interval_seconds}s, running={config.is_running}")
        return config
    finally:
        db.close()