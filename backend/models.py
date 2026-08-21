import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class ConnectionProtocol(str, enum.Enum):
    TCP = "tcp"
    RTU = "rtu"
    RTU_OVER_TCP = "rtu_over_tcp"


class ModbusFunctionCode(int, enum.Enum):
    READ_COILS = 1
    READ_DISCRETE_INPUTS = 2
    READ_HOLDING_REGISTERS = 3
    READ_INPUT_REGISTERS = 4


class DataType(str, enum.Enum):
    INT16 = "int16"
    UINT16 = "uint16"
    INT32 = "int32"
    UINT32 = "uint32"
    FLOAT32 = "float32"
    FLOAT64 = "float64"


class ByteOrder(str, enum.Enum):
    BIG = "big"
    LITTLE = "little"


class WordOrder(str, enum.Enum):
    BIG = "big"
    LITTLE = "little"


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    protocol = Column(Enum(ConnectionProtocol), default=ConnectionProtocol.TCP, nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=502, nullable=False)
    slave_id = Column(Integer, default=1, nullable=False)
    timeout_ms = Column(Integer, default=3000, nullable=False)
    
    # Serial/RTU specific
    serial_port = Column(String(100), nullable=True)
    baud_rate = Column(Integer, nullable=True)
    data_bits = Column(Integer, nullable=True)
    parity = Column(String(10), nullable=True)
    stop_bits = Column(Integer, nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    devices = relationship("Device", back_populates="connection", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("connections.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    slave_id = Column(Integer, default=1, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    connection = relationship("Connection", back_populates="devices")
    data_points = relationship("DataPoint", back_populates="device", cascade="all, delete-orphan")
    readings = relationship("SensorReading", back_populates="device", cascade="all, delete-orphan")
    raw_logs = relationship("RawLog", back_populates="device", cascade="all, delete-orphan")


class DataPoint(Base):
    __tablename__ = "data_points"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    function_code = Column(Enum(ModbusFunctionCode), default=ModbusFunctionCode.READ_INPUT_REGISTERS, nullable=False)
    address = Column(Integer, nullable=False)
    register_count = Column(Integer, default=1, nullable=False)
    data_type = Column(Enum(DataType), default=DataType.INT16, nullable=False)
    byte_order = Column(Enum(ByteOrder), default=ByteOrder.BIG, nullable=False)
    word_order = Column(Enum(WordOrder), default=WordOrder.BIG, nullable=False)
    scale = Column(Float, default=1.0, nullable=False)
    offset = Column(Float, default=0.0, nullable=False)
    unit = Column(String(20), nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    device = relationship("Device", back_populates="data_points")
    readings = relationship("SensorReading", back_populates="data_point", cascade="all, delete-orphan")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    data_point_id = Column(Integer, ForeignKey("data_points.id", ondelete="CASCADE"), nullable=False)
    value = Column(Float, nullable=False)
    raw_value = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    device = relationship("Device", back_populates="readings")
    data_point = relationship("DataPoint", back_populates="readings")


class RawLog(Base):
    __tablename__ = "raw_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    connection_id = Column(Integer, ForeignKey("connections.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    slave_id = Column(Integer, nullable=False)
    function_code = Column(Integer, nullable=False)
    address = Column(Integer, nullable=False)
    registers = Column(JSON, nullable=True)
    status = Column(String(20), nullable=False)  # OK, ERROR
    error = Column(Text, nullable=True)

    device = relationship("Device", back_populates="raw_logs")
    connection = relationship("Connection")


class SchedulerConfig(Base):
    __tablename__ = "scheduler_config"

    id = Column(Integer, primary_key=True, index=True)
    poll_interval_seconds = Column(Integer, default=1, nullable=False)
    log_interval_seconds = Column(Integer, default=30, nullable=False)
    is_running = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)