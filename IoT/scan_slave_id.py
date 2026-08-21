"""
Scan Slave ID - cari tau device address sensor-sensor yang ada di 1 jalur RS485
==================================================================================
Berguna kalau ada 2+ sensor nyambung ke 1 converter yang sama, dan kita perlu tau
Slave ID masing-masing (karena default sensor XY-MD02 = 1, tapi kalau ada 2 device
dengan ID sama di jalur yang sama, bakal bentrok).

CARA PAKAI:
    pip install pymodbus
    python scan_slave_id.py
"""

from pymodbus.client import ModbusTcpClient

IP = "192.168.0.7"
PORT = 502
START_ADDRESS = 1     # sesuai konfigurasi yang terbukti berhasil
COUNT = 2
ID_RANGE = range(1, 11)  # coba slave ID 1 sampai 10

print(f"Scanning slave ID di {IP}:{PORT} ...\n")

found = []

for slave_id in ID_RANGE:
    client = ModbusTcpClient(IP, port=PORT, timeout=1.5)
    try:
        if not client.connect():
            print(f"ID {slave_id}: gagal connect ke converter (cek IP/port).")
            break

        result = client.read_input_registers(
            address=START_ADDRESS, count=COUNT, device_id=slave_id
        )

        if result.isError():
            print(f"ID {slave_id}: tidak ada respon / error ({result})")
        else:
            regs = result.registers
            suhu = regs[0] / 10.0
            kelembaban = regs[1] / 10.0
            print(f"ID {slave_id}: DITEMUKAN! Suhu={suhu}C, Kelembaban={kelembaban}%RH, raw={regs}")
            found.append(slave_id)
    except Exception as exc:  # noqa: BLE001
        print(f"ID {slave_id}: exception - {type(exc).__name__}: {exc}")
    finally:
        client.close()

print("\n=== Hasil ===")
if found:
    print(f"Slave ID yang merespon: {found}")
else:
    print("Tidak ada slave ID yang merespon di range yang dicoba.")