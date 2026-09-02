import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.base import JobLookupError
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Device, DataPoint, Connection, SchedulerConfig
from modbus_service import read_device_data
from api.collector import receive_sensor_data

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
                await receive_sensor_data(collector_data, db)
            except Exception as e:
                logger.error(f"Error polling device {device.name}: {e}")
    finally:
        db.close()


async def log_job():
    """Log job placeholder - historical logging is handled in collector endpoint."""
    logger.debug("Historical log job triggered (handled in collector)")


def start_scheduler():
    """Start the scheduler engine and add jobs based on DB config."""
    db = SessionLocal()
    try:
        config = db.query(SchedulerConfig).first()
        if not config:
            # First run: auto-enable polling with a 5-second interval
            config = SchedulerConfig(
                poll_interval_seconds=5,
                log_interval_seconds=30,
                is_running=True,
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        elif not config.is_running:
            # Existing config says stopped — force-enable so data flows on startup
            config.is_running = True
            db.commit()

        # Always start the APScheduler engine
        scheduler.start()

        if config.is_running:
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
            logger.info(
                f"Scheduler started: poll={config.poll_interval_seconds}s, "
                f"log={config.log_interval_seconds}s"
            )
        else:
            logger.info(
                "Scheduler engine started but no jobs active (is_running=False)."
            )
    finally:
        db.close()


def stop_scheduler():
    """Stop the scheduler if it was started."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
    else:
        logger.info("Scheduler was not running")


def update_scheduler_intervals(
    poll_interval: int = None,
    log_interval: int = None,
    is_running: bool = None,
):
    """Update scheduler intervals and running state."""
    db = SessionLocal()
    try:
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

        if poll_interval is not None:
            config.poll_interval_seconds = poll_interval
        if log_interval is not None:
            config.log_interval_seconds = log_interval
        if is_running is not None:
            config.is_running = is_running

        db.commit()

        if config.is_running:
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
            for job_id in ("poll_job", "log_job"):
                try:
                    scheduler.remove_job(job_id)
                except JobLookupError:
                    pass
            if scheduler.running and len(scheduler.get_jobs()) == 0:
                scheduler.shutdown(wait=False)

        logger.info(
            f"Scheduler updated: poll={config.poll_interval_seconds}s, "
            f"log={config.log_interval_seconds}s, running={config.is_running}"
        )
        return config
    finally:
        db.close()