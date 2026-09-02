from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "IoT Sensor Monitor"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./sensor_monitor.db"
    
    # Backend API
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    COLLECTOR_BACKEND_URL: str = 'http://127.0.0.1:8000'
    
    # Python Collector
    COLLECTOR_POLL_INTERVAL: int = 1  # seconds for realtime
    COLLECTOR_LOG_INTERVAL: int = 30  # seconds for historical logging
    
    # Default Modbus (can be overridden by connection config)
    DEFAULT_MODBUS_HOST: str = "192.168.0.7"
    DEFAULT_MODBUS_PORT: int = 502
    DEFAULT_MODBUS_TIMEOUT: float = 3.0
    DEFAULT_SLAVE_ID: int = 1
    DEFAULT_START_ADDRESS: int = 1
    DEFAULT_REGISTER_COUNT: int = 2
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()