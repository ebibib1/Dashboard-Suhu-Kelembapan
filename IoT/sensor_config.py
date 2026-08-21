# CONFIGURATION

# Pilihan:
# "tcp" = Modbus TCP standar
# "rtu" = Modbus RTU over TCP / RTU Transparent
MODBUS_MODE = "tcp"

# Koneksi Converter

MODBUS_HOST = "192.168.0.7"
MODBUS_PORT = 502
MODBUS_TIMEOUT = 3

# Sensor XY-MD02

SLAVE_ID = 1

# Register:x1
# 1 = Temperature
# 2 = Humidity
START_ADDRESS = 1
REGISTER_COUNT = 2

# Polling

POLL_INTERVAL = 3

# CSV Logger

CSV_OUTPUT = "suhu_humidity.csv"

# Dashboard

MAX_HISTORY = 500