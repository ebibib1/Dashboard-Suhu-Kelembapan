from typing import List, Optional, Tuple
from pymodbus.client import ModbusTcpClient, ModbusSerialClient
from pymodbus import FramerType
from pymodbus.exceptions import ModbusException
import struct
from models import (
    Connection, Device, DataPoint, 
    ConnectionProtocol, ModbusFunctionCode, DataType, ByteOrder, WordOrder
)
from schemas import CollectorDataIn
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def create_modbus_client(connection: Connection):
    """Create Modbus client based on connection configuration."""
    if connection.protocol == ConnectionProtocol.TCP:
        return ModbusTcpClient(
            host=connection.host,
            port=connection.port,
            timeout=connection.timeout_ms / 1000.0,
        )
    elif connection.protocol == ConnectionProtocol.RTU_OVER_TCP:
        return ModbusTcpClient(
            host=connection.host,
            port=connection.port,
            timeout=connection.timeout_ms / 1000.0,
            framer=FramerType.RTU,
        )
    elif connection.protocol == ConnectionProtocol.RTU:
        return ModbusSerialClient(
            port=connection.serial_port or "COM3",
            baudrate=connection.baud_rate or 9600,
            bytesize=connection.data_bits or 8,
            parity=connection.parity or 'N',
            stopbits=connection.stop_bits or 1,
            timeout=connection.timeout_ms / 1000.0,
        )
    else:
        raise ValueError(f"Unsupported protocol: {connection.protocol}")


def decode_register_value(
    registers: List[int],
    data_type: DataType,
    byte_order: ByteOrder,
    word_order: WordOrder,
    register_count: int
) -> float:
    """Decode raw register values based on data type and byte/word order."""
    if not registers:
        raise ValueError("No registers to decode")
    
    # Prepare byte order format
    byte_fmt = '>' if byte_order == ByteOrder.BIG else '<'
    
    # For multi-register values, handle word order
    if register_count > 1 and word_order == WordOrder.LITTLE:
        registers = registers[::-1]
    
    # Combine registers into bytes
    byte_data = b''.join(reg.to_bytes(2, byteorder='big') for reg in registers[:register_count])
    
    # Decode based on data type
    try:
        if data_type == DataType.INT16:
            if register_count != 1:
                raise ValueError("INT16 requires exactly 1 register")
            value = struct.unpack(f'{byte_fmt}h', byte_data)[0]
        elif data_type == DataType.UINT16:
            if register_count != 1:
                raise ValueError("UINT16 requires exactly 1 register")
            value = struct.unpack(f'{byte_fmt}H', byte_data)[0]
        elif data_type == DataType.INT32:
            if register_count != 2:
                raise ValueError("INT32 requires exactly 2 registers")
            value = struct.unpack(f'{byte_fmt}i', byte_data)[0]
        elif data_type == DataType.UINT32:
            if register_count != 2:
                raise ValueError("UINT32 requires exactly 2 registers")
            value = struct.unpack(f'{byte_fmt}I', byte_data)[0]
        elif data_type == DataType.FLOAT32:
            if register_count != 2:
                raise ValueError("FLOAT32 requires exactly 2 registers")
            value = struct.unpack(f'{byte_fmt}f', byte_data)[0]
        elif data_type == DataType.FLOAT64:
            if register_count != 4:
                raise ValueError("FLOAT64 requires exactly 4 registers")
            value = struct.unpack(f'{byte_fmt}d', byte_data)[0]
        else:
            raise ValueError(f"Unsupported data type: {data_type}")
    except struct.error as e:
        raise ValueError(f"Failed to decode registers: {e}")
    
    return float(value)


def read_device_data(connection: Connection, device: Device, data_points: List[DataPoint]) -> CollectorDataIn:
    """Read all data points for a device and return collector data."""
    client = None
    timestamp = datetime.utcnow()
    readings = []
    raw_registers_all = []
    status = "OK"
    error = None
    function_code = 0
    address = 0
    
    try:
        client = create_modbus_client(connection)
        
        if not client.connect():
            raise ConnectionError(f"Failed to connect to {connection.host}:{connection.port}")
        
        # Group data points by function code and address range for efficient reading
        # For simplicity, read each data point individually
        for dp in data_points:
            if not dp.enabled:
                continue
            
            function_code = dp.function_code.value
            address = dp.address
            register_count = dp.register_count
            
            try:
                if dp.function_code == ModbusFunctionCode.READ_INPUT_REGISTERS:
                    result = client.read_input_registers(
                        address=address,
                        count=register_count,
                        device_id=device.slave_id,
                    )
                elif dp.function_code == ModbusFunctionCode.READ_HOLDING_REGISTERS:
                    result = client.read_holding_registers(
                        address=address,
                        count=register_count,
                        device_id=device.slave_id,
                    )
                else:
                    raise ValueError(f"Unsupported function code: {dp.function_code}")
                
                if result.isError():
                    raise ModbusException(f"Modbus error: {result}")
                
                registers = result.registers
                if len(registers) < register_count:
                    raise ValueError(f"Insufficient registers: got {len(registers)}, expected {register_count}")
                
                raw_registers_all.extend(registers)
                
                raw_value = decode_register_value(
                    registers, dp.data_type, dp.byte_order, dp.word_order, register_count
                )
                
                # Apply scale and offset
                scaled_value = raw_value * dp.scale + dp.offset
                
                readings.append({
                    "data_point_id": dp.id,
                    "value": scaled_value,
                    "raw_value": registers[0] if registers else 0,
                })
                
            except Exception as e:
                logger.error(f"Error reading data point {dp.name}: {e}")
                readings.append({
                    "data_point_id": dp.id,
                    "value": 0.0,
                    "raw_value": 0,
                })
                status = "PARTIAL_ERROR"
                error = str(e)
    
    except Exception as e:
        logger.error(f"Error reading device {device.name}: {e}")
        status = "ERROR"
        error = str(e)
    
    finally:
        if client:
            client.close()
    
    return CollectorDataIn(
        device_id=device.id,
        connection_id=connection.id,
        timestamp=timestamp,
        readings=readings,
        raw_registers=raw_registers_all,
        function_code=function_code,
        address=address,
        status=status,
        error=error,
    )


def test_connection(connection: Connection) -> Tuple[bool, str, Optional[dict]]:
    """Test a connection using the first enabled data point on an active device."""
    client = None
    try:
        client = create_modbus_client(connection)
        
        if not client.connect():
            return False, f"Failed to connect to {connection.host}:{connection.port}", None
        
        device = next((item for item in connection.devices if item.is_active), None)
        data_point = next((item for item in device.data_points if item.enabled), None) if device else None
        if not device or not data_point:
            return False, "No active device/data point configured for this connection", None

        slave_id = device.slave_id
        address = data_point.address
        count = data_point.register_count
        if int(data_point.function_code) == 3:
            result = client.read_holding_registers(address=address, count=count, device_id=slave_id)
        elif int(data_point.function_code) == 4:
            result = client.read_input_registers(address=address, count=count, device_id=slave_id)
        else:
            return False, f"Unsupported test function code: {data_point.function_code}", None
        
        if result.isError():
            return False, f"Modbus error: {result}", None
        
        return True, "Connection successful", {"registers": result.registers, "address": address, "slave_id": slave_id}
    
    except Exception as e:
        return False, f"{type(e).__name__}: {e}", None
    
    finally:
        if client:
            client.close()
