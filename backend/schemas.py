from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from models import (
    ConnectionProtocol, ModbusFunctionCode, DataType, 
    ByteOrder, WordOrder
)


class ConnectionBase(BaseModel):
    name: str = Field(..., max_length=100)
    protocol: ConnectionProtocol = ConnectionProtocol.TCP
    host: str = Field(..., max_length=255)
    port: int = Field(default=502, ge=1, le=65535)
    slave_id: int = Field(default=1, ge=1, le=247)
    timeout_ms: int = Field(default=3000, ge=100)
    serial_port: Optional[str] = None
    baud_rate: Optional[int] = None
    data_bits: Optional[int] = None
    parity: Optional[str] = None
    stop_bits: Optional[int] = None


class ConnectionCreate(ConnectionBase):
    pass


class ConnectionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    protocol: Optional[ConnectionProtocol] = None
    host: Optional[str] = Field(None, max_length=255)
    port: Optional[int] = Field(None, ge=1, le=65535)
    slave_id: Optional[int] = Field(None, ge=1, le=247)
    timeout_ms: Optional[int] = Field(None, ge=100)
    serial_port: Optional[str] = None
    baud_rate: Optional[int] = None
    data_bits: Optional[int] = None
    parity: Optional[str] = None
    stop_bits: Optional[int] = None
    is_active: Optional[bool] = None


class ConnectionResponse(ConnectionBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeviceBase(BaseModel):
    name: str = Field(..., max_length=100)
    slave_id: int = Field(default=1, ge=1, le=247)
    description: Optional[str] = None


class DeviceCreate(DeviceBase):
    connection_id: int


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    slave_id: Optional[int] = Field(None, ge=1, le=247)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DeviceResponse(DeviceBase):
    id: int
    connection_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DataPointBase(BaseModel):
    name: str = Field(..., max_length=100)
    function_code: ModbusFunctionCode = ModbusFunctionCode.READ_INPUT_REGISTERS
    address: int = Field(..., ge=0)
    register_count: int = Field(default=1, ge=1)
    data_type: DataType = DataType.INT16
    byte_order: ByteOrder = ByteOrder.BIG
    word_order: WordOrder = WordOrder.BIG
    scale: float = Field(default=1.0)
    offset: float = Field(default=0.0)
    unit: Optional[str] = None
    enabled: bool = True


class DataPointCreate(DataPointBase):
    device_id: int


class DataPointUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    function_code: Optional[ModbusFunctionCode] = None
    address: Optional[int] = Field(None, ge=0)
    register_count: Optional[int] = Field(None, ge=1)
    data_type: Optional[DataType] = None
    byte_order: Optional[ByteOrder] = None
    word_order: Optional[WordOrder] = None
    scale: Optional[float] = None
    offset: Optional[float] = None
    unit: Optional[str] = None
    enabled: Optional[bool] = None


class DataPointResponse(DataPointBase):
    id: int
    device_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SensorReadingResponse(BaseModel):
    id: int
    device_id: int
    data_point_id: int
    value: float
    raw_value: Optional[int]
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class CurrentReadingResponse(BaseModel):
    data_point_id: int
    name: str
    value: float
    unit: Optional[str]
    timestamp: datetime


class RawLogResponse(BaseModel):
    id: int
    device_id: int
    connection_id: Optional[int]
    timestamp: datetime
    slave_id: int
    function_code: int
    address: int
    registers: Optional[List[int]]
    status: str
    error: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class SchedulerConfigResponse(BaseModel):
    poll_interval_seconds: int
    log_interval_seconds: int
    is_running: bool

    model_config = ConfigDict(from_attributes=True)


class SchedulerConfigUpdate(BaseModel):
    poll_interval_seconds: Optional[int] = Field(None, ge=1)
    log_interval_seconds: Optional[int] = Field(None, ge=1)
    is_running: Optional[bool] = None


class ConnectionTestRequest(BaseModel):
    connection_id: int


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


class CollectorDataIn(BaseModel):
    device_id: int
    connection_id: int
    timestamp: datetime
    readings: List[dict]  # [{"data_point_id": int, "value": float, "raw_value": int}]
    raw_registers: List[int]
    function_code: int
    address: int
    status: str
    error: Optional[str] = None