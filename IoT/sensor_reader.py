import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)


from pymodbus.client import ModbusTcpClient
from pymodbus import FramerType

from sensor_config import (
    MODBUS_MODE,
    MODBUS_HOST,
    MODBUS_PORT,
    MODBUS_TIMEOUT,
    SLAVE_ID,
    START_ADDRESS,
    REGISTER_COUNT,
)

# ============================================================
# REGISTER CONVERSION
# ============================================================

def to_signed_16(value: int) -> int:
    """
    Convert unsigned 16-bit menjadi signed 16-bit.

    Contoh:
        0xFF33 -> -205
    """
    return value - 65536 if value > 32767 else value


# ============================================================
# MODBUS CLIENT
# ============================================================

def create_client(
    host: str = MODBUS_HOST,
    port: int = MODBUS_PORT,
    timeout: float = MODBUS_TIMEOUT,
    mode: str = MODBUS_MODE,
):
    """
    Membuat Modbus client berdasarkan mode.

    tcp:
        Modbus TCP standar.

    rtu:
        Modbus RTU yang dikirim melalui TCP socket.
    """

    mode = mode.lower()

    if mode == "tcp":
        client = ModbusTcpClient(
            host=host,
            port=port,
            timeout=timeout,
        )

    elif mode == "rtu":
        client = ModbusTcpClient(
            host=host,
            port=port,
            timeout=timeout,
            framer=FramerType.RTU,
        )

    else:
        raise ValueError(
            f"MODBUS_MODE tidak valid: {mode}. "
            "Gunakan 'tcp' atau 'rtu'."
        )

    return client


# ============================================================
# SENSOR READER
# ============================================================

def read_sensor(
    host: str = MODBUS_HOST,
    port: int = MODBUS_PORT,
    slave_id: int = SLAVE_ID,
    address: int = START_ADDRESS,
    count: int = REGISTER_COUNT,
    timeout: float = MODBUS_TIMEOUT,
    mode: str = MODBUS_MODE,
):
    """
    Membaca data sensor XY-MD02.

    Return:
        {
            "ok": bool,
            "suhu": float | None,
            "kelembaban": float | None,
            "raw": dict | None,
            "error": str | None,
        }
    """

    output = {
        "ok": False,
        "suhu": None,
        "kelembaban": None,
        "raw": None,
        "error": None,
    }

    client = None

    try:
        # ----------------------------------------------------
        # CREATE CLIENT
        # ----------------------------------------------------

        client = create_client(
            host=host,
            port=port,
            timeout=timeout,
            mode=mode,
        )

        # ----------------------------------------------------
        # CONNECT
        # ----------------------------------------------------

        if not client.connect():
            output["error"] = (
                f"Gagal connect ke {host}:{port}"
            )

            return output

        # ----------------------------------------------------
        # READ INPUT REGISTERS
        # ----------------------------------------------------

        result = client.read_input_registers(
            address=address,
            count=count,
            device_id=slave_id,
        )

        if result.isError():
            output["error"] = (
                f"Modbus Error: {result}"
            )

            return output

        registers = result.registers

        # ----------------------------------------------------
        # VALIDATE REGISTER DATA
        # ----------------------------------------------------

        if len(registers) < 2:
            output["error"] = (
                "Jumlah register tidak cukup. "
                f"Diterima: {len(registers)}"
            )

            return output

        # ----------------------------------------------------
        # RAW REGISTER
        # ----------------------------------------------------

        raw_temperature = registers[0]
        raw_humidity = registers[1]

        # ----------------------------------------------------
        # CONVERT SENSOR DATA
        # ----------------------------------------------------

        temperature = (
            to_signed_16(raw_temperature) / 10.0
        )

        humidity = (
            raw_humidity / 10.0
        )

        # ----------------------------------------------------
        # BUILD SUCCESS RESPONSE
        # ----------------------------------------------------

        output["ok"] = True
        output["suhu"] = temperature
        output["kelembaban"] = humidity

        output["raw"] = {
            "temperature": raw_temperature,
            "humidity": raw_humidity,
        }

        return output

    # --------------------------------------------------------
    # ERROR HANDLING
    # --------------------------------------------------------

    except Exception as exc:
        output["error"] = (
            f"{type(exc).__name__}: {exc}"
        )

        return output

    # --------------------------------------------------------
    # CLEANUP
    # --------------------------------------------------------

    finally:
        if client:
            client.close()

if __name__ == "__main__":

    print("=" * 50)
    print("TEST SENSOR XY-MD02")
    print("=" * 50)

    result = read_sensor()

    if result["ok"]:
        print("STATUS      : BERHASIL")
        print(f"Suhu        : {result['suhu']:.1f} °C")
        print(f"Kelembaban  : {result['kelembaban']:.1f} %RH")
        print(f"Raw Data    : {result['raw']}")
    else:
        print("STATUS : GAGAL")
        print(f"ERROR  : {result['error']}")