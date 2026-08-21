# IoT Modbus Monitoring System - Agent Context

## 1. Project Overview

Project ini adalah sistem monitoring IoT berbasis web yang membaca data perangkat/sensor melalui Modbus.

Target awal menggunakan sensor **XY-MD02** untuk membaca:

- Temperature
- Humidity

Namun sistem **jangan dibuat hardcoded hanya untuk XY-MD02**. Target jangka panjang adalah membuat sistem yang lebih universal, dengan konsep yang terinspirasi dari ModbusPoll: user dapat mengatur koneksi, register, tipe data, scaling, polling, dan logging melalui aplikasi.

## 2. Main Goal

Bangun aplikasi web yang dapat:

1. Terhubung ke device Modbus TCP.
2. Mendukung Modbus RTU / RTU over TCP sesuai kebutuhan implementasi.
3. Membaca register secara realtime.
4. Menampilkan data realtime pada dashboard.
5. Menyimpan konfigurasi koneksi.
6. Menyimpan konfigurasi sensor/register.
7. Melakukan polling dengan interval yang dapat dikonfigurasi.
8. Melakukan logging historical dengan interval terpisah dari realtime polling.
9. Menyimpan raw register untuk kebutuhan debugging/audit.
10. Dapat dikembangkan untuk berbagai jenis sensor/device Modbus, bukan hanya temperature/humidity.

---

# 3. Architecture

Gunakan pemisahan tanggung jawab berikut:

```text
                    MODBUS DEVICE
                         |
                      Modbus
                         |
                         v
                +------------------+
                | Python Collector |
                |                  |
                | Modbus Client    |
                | Register Reader  |
                +--------+---------+
                         |
                    Sensor Data
                         |
                         v
                +------------------+
                |     Backend      |
                |                  |
                | API              |
                | Scheduler        |
                | Validation       |
                | Database         |
                | Realtime         |
                +--------+---------+
                         |
              +----------+----------+
              |                     |
              v                     v
       Historical Data        Realtime Data
              |                     |
              +----------+----------+
                         |
                         v
                +------------------+
                |     Next.js      |
                |    Dashboard     |
                +------------------+
```

## Responsibility

### Python Sensor Service

Python bertanggung jawab terhadap hardware/Modbus communication.

Tugas:

- connect ke Modbus device
- read register
- decode raw register
- melakukan conversion berdasarkan konfigurasi
- polling sensor/device
- mengirim hasil pembacaan ke backend

Python **bukan UI layer**.

### Backend

Backend adalah pusat sistem.

Tugas:

- menerima data dari Python
- validasi data
- mengelola connection configuration
- mengelola sensor/register configuration
- mengelola scheduler
- menyimpan historical data
- menyimpan raw log
- menyediakan API
- menyediakan realtime data stream

### Next.js

Next.js hanya bertanggung jawab terhadap web application/UI.

Tugas:

- configuration UI
- sensor setup UI
- dashboard
- realtime monitoring
- historical chart
- raw log viewer
- status koneksi

Browser **tidak boleh berkomunikasi langsung dengan Modbus device**.

---

# 4. Current Python Implementation

Saat ini sudah ada Python code untuk membaca XY-MD02.

File utama:

```text
sensor_reader.py
config.py
```

Fungsi utama:

```python
read_sensor()
```

Saat ini flow-nya:

```text
Modbus Device
    ↓
read_input_registers()
    ↓
register[0] = temperature
register[1] = humidity
    ↓
temperature = signed_16(register[0]) / 10
humidity = register[1] / 10
```

Return structure saat ini:

```json
{
  "ok": true,
  "suhu": 27.4,
  "kelembaban": 68.2,
  "raw": {
    "temperature": 274,
    "humidity": 682
  },
  "error": null
}
```

Code existing harus dipertahankan sebagai baseline dan jangan diubah secara agresif tanpa alasan.

---

# 5. Important Design Decision: Universal Modbus Configuration

Jangan membuat sistem bergantung pada:

```python
temperature = registers[0] / 10
humidity = registers[1] / 10
```

sebagai logic permanen.

Itu hanya cocok untuk sensor tertentu.

Gunakan konfigurasi register/data point.

Contoh:

```json
{
  "name": "Temperature",
  "function": 4,
  "address": 0,
  "data_type": "int16",
  "scale": 0.1,
  "offset": 0,
  "unit": "°C"
}
```

Humidity:

```json
{
  "name": "Humidity",
  "function": 4,
  "address": 1,
  "data_type": "uint16",
  "scale": 0.1,
  "offset": 0,
  "unit": "%RH"
}
```

Dengan model ini, device lain dapat digunakan tanpa mengubah core Modbus reader.

---

# 6. Connection Configuration

Connection configuration berarti konfigurasi bagaimana aplikasi terhubung ke device.

Menu:

```text
Connections
```

Contoh Modbus TCP:

```text
Connection Name
Protocol
Host / IP
Port
Slave ID
Timeout
```

Contoh:

```text
Connection Name: XY-MD02 Room 01
Protocol: Modbus TCP
Host: 192.168.1.100
Port: 502
Slave ID: 1
Timeout: 1000 ms
```

Jika menggunakan serial Modbus RTU, parameter dapat mencakup:

```text
Serial Port
Baud Rate
Data Bits
Parity
Stop Bits
Slave ID
Timeout
```

Jika implementasi yang digunakan adalah RTU over TCP, gunakan konfigurasi yang sesuai dengan transport tersebut. Jangan mencampurkan parameter serial ke TCP tanpa kebutuhan teknis.

Connection dan sensor configuration harus menjadi dua konsep berbeda.

---

# 7. Sensor / Register Configuration

Menu:

```text
Sensors
```

Sensor setup menentukan data apa yang dibaca dari device.

Contoh:

```text
Sensor Name
Connection
Slave ID
Function
Start Address
Register Count
Data Type
Scale
Offset
Unit
```

Untuk sistem yang lebih fleksibel, gunakan konsep:

```text
Device
  └── Data Points
       ├── Temperature
       ├── Humidity
       ├── Pressure
       ├── Voltage
       └── ...
```

Setiap data point memiliki konfigurasi register sendiri.

---

# 8. Recommended Data Point Model

Minimal data point configuration:

```text
id
sensor_id
name
function_code
address
register_count
data_type
byte_order
word_order
scale
offset
unit
enabled
```

Contoh:

```json
{
  "name": "Temperature",
  "function_code": 4,
  "address": 0,
  "register_count": 1,
  "data_type": "int16",
  "byte_order": "big",
  "word_order": "big",
  "scale": 0.1,
  "offset": 0,
  "unit": "°C",
  "enabled": true
}
```

Jangan menambahkan kompleksitas yang belum diperlukan. Field dapat ditambah ketika device lain membutuhkan decoding yang lebih kompleks.

---

# 9. Realtime Monitoring

Dashboard/Home harus menampilkan realtime data.

Target polling awal:

```text
1 second
```

Contoh:

```text
09:00:01 → 27.1 °C
09:00:02 → 27.2 °C
09:00:03 → 27.2 °C
09:00:04 → 27.3 °C
```

Realtime polling dan database logging adalah dua hal berbeda.

Jangan memaksa setiap realtime reading masuk database.

---

# 10. Realtime Transport

Untuk prototype:

```text
Python → HTTP → Backend
```

dapat digunakan.

Untuk realtime dashboard:

```text
Backend → WebSocket/SSE → Next.js
```

Target final:

```text
Sensor
  ↓
Python Collector
  ↓
Backend
  ↓
WebSocket/SSE
  ↓
Next.js
```

Jika jumlah device masih kecil, jangan over-engineer.

Jika jumlah device meningkat besar, pertimbangkan MQTT/message broker atau persistent connection.

JSON bukan bottleneck untuk skala kecil.

---

# 11. Logging Scheduler

Realtime polling:

```text
1 second
```

tidak harus sama dengan historical logging.

Contoh:

```text
Sensor reading:
1 second

Dashboard:
1 second

Database historical log:
30 seconds / 60 seconds
```

Contoh:

```text
09:00:01  27.1
09:00:02  27.2
09:00:03  27.2
...
09:00:59  27.4
09:01:00  27.5
```

Database dapat menyimpan hasil agregasi setiap 1 menit.

Possible aggregation:

```text
average
minimum
maximum
last value
```

Jangan melakukan agregasi jika requirement sebenarnya membutuhkan raw per-second history.

---

# 12. Raw Data Logging

Sistem perlu memiliki raw data log untuk debugging.

Raw log dapat menyimpan:

```text
timestamp
connection_id
device_id
slave_id
function_code
address
registers
status
error
```

Contoh:

```json
{
  "timestamp": "2026-08-21T09:42:00",
  "slave_id": 1,
  "function_code": 4,
  "address": 0,
  "registers": [274, 682]
}
```

Tujuan raw log:

- debugging
- tracing conversion
- troubleshooting device
- audit komunikasi Modbus

Raw log tidak harus ditampilkan sebagai bagian utama dashboard. Buat halaman/expander khusus.

---

# 13. Dashboard / Home

Dashboard utama minimal menampilkan:

```text
Connection Status
Last Update
Realtime Data
Temperature
Humidity
Chart
```

Contoh:

```text
Temperature
27.4 °C

Humidity
68.2 %RH

Status
Connected

Last Update
09:42:31
```

Jika sistem sudah universal, jangan hardcode card hanya:

```text
Temperature
Humidity
```

Gunakan dynamic data points:

```text
Temperature
Humidity
Pressure
Voltage
...
```

UI harus membaca metadata dari backend.

---

# 14. Main Navigation

Recommended navigation:

```text
Home
Connections
Sensors
Scheduler
Logs
```

### Home

Realtime monitoring.

### Connections

Connection profile management.

### Sensors

Sensor/device and register/data point configuration.

### Scheduler

Polling and logging interval.

### Logs

Historical readings and raw Modbus logs.

---

# 15. Backend Data Model

Minimal entities:

```text
connections
devices / sensors
data_points
sensor_readings
raw_logs
scheduler_jobs
```

Relationship:

```text
connections
    |
    | 1:N
    v
devices
    |
    | 1:N
    v
data_points
    |
    | 1:N
    v
sensor_readings
```

Raw logs dapat berhubungan dengan connection/device.

---

# 16. API Concept

Minimal endpoint:

```text
GET    /api/connections
POST   /api/connections
GET    /api/connections/:id
PUT    /api/connections/:id
DELETE /api/connections/:id
POST   /api/connections/:id/test
```

Sensor:

```text
GET    /api/sensors
POST   /api/sensors
GET    /api/sensors/:id
PUT    /api/sensors/:id
DELETE /api/sensors/:id
```

Data points:

```text
GET    /api/sensors/:id/data-points
POST   /api/sensors/:id/data-points
PUT    /api/data-points/:id
DELETE /api/data-points/:id
```

Readings:

```text
GET /api/sensors/:id/current
GET /api/sensors/:id/history
```

Raw logs:

```text
GET /api/logs/raw
```

Scheduler:

```text
GET /api/scheduler
PUT /api/scheduler
```

Endpoint naming can be adjusted to the selected backend framework.

---

# 17. Performance Considerations

One sensor sending one JSON payload per second is lightweight.

Approximate order:

```text
1 reading / second
60 readings / minute
3,600 readings / hour
86,400 readings / day
```

The main concern is not JSON size.

The main concerns are:

- number of sensors
- number of requests
- database writes
- active dashboard clients
- network reliability
- Modbus device limitations

For a small deployment, HTTP + JSON is sufficient.

Do not introduce Kafka, MQTT, Redis, or other infrastructure just because it exists. Add infrastructure only when actual requirements justify it.

---

# 18. Error Handling

Python must handle at least:

```text
Connection failure
Timeout
Modbus error
Invalid response
Insufficient registers
Invalid data type
Invalid configuration
```

Standard result format:

```json
{
  "ok": false,
  "error": "Gagal connect ke 192.168.1.100:502"
}
```

Backend must validate incoming data.

Minimum validation:

```text
sensor/device exists
data point exists
temperature/humidity/value is valid
timestamp is valid
```

Do not trust client-provided values blindly.

---

# 19. Security

Minimum requirements:

- Never hardcode secrets in source code.
- Use environment variables.
- Validate incoming sensor data.
- Authenticate management endpoints.
- Restrict configuration endpoints to authorized users.
- Do not expose Modbus devices directly to the public internet.
- Do not expose raw Modbus control/write operations unless explicitly required.
- Start with read-only Modbus operations for monitoring.

If write operations are later added, treat them as a separate feature with strict validation and authorization.

---

# 20. Current vs Target System

## Current

```text
XY-MD02
   ↓
Python
   ↓
Streamlit
```

Current Python reader is specialized for XY-MD02.

## Target

```text
Modbus Device
   ↓
Python Collector
   ↓
Backend
   ├── Database
   ├── Scheduler
   ├── API
   └── Realtime
        ↓
     Next.js
```

The target system should support configurable data points.

---

# 21. Implementation Priority

Implement in this order:

```text
1. Keep current Modbus reader working
2. Separate Python collector from Streamlit UI
3. Create connection model
4. Create sensor/device model
5. Create data point/register configuration
6. Create backend API
7. Connect Python collector to backend
8. Store current sensor state
9. Add Next.js dashboard
10. Add realtime transport
11. Add scheduler
12. Add historical logging
13. Add raw Modbus logging
14. Add authentication/authorization
15. Generalize for additional Modbus devices
```

Do not rewrite everything at once.

---

# 22. Agent Rules

When modifying this project:

1. Preserve working Modbus communication unless there is a clear reason to change it.
2. Do not hardcode XY-MD02-specific assumptions into the universal architecture.
3. Keep Python focused on Modbus/hardware communication.
4. Keep Next.js focused on UI.
5. Keep business logic and persistence in the backend.
6. Separate realtime data from historical logging.
7. Prefer simple architecture before adding infrastructure.
8. Do not change existing logic just for stylistic reasons.
9. Explain breaking changes before applying them.
10. Keep configuration in environment variables or database configuration, not hardcoded secrets.
11. Use clear naming and consistent formatting.
12. Prefer small, testable modules.
13. When adding a new Modbus device, prefer configuration/data-point definitions over creating a new hardcoded reader.
14. Read existing project files before creating duplicate functionality.
15. Do not create unnecessary abstractions before the requirement exists.

---

# 23. Definition of Done

A basic version is considered working when:

- Python can connect to the Modbus device.
- Sensor data can be read reliably.
- Backend can receive the data.
- Current sensor state can be retrieved through API.
- Next.js can display realtime sensor values.
- Connection status is visible.
- Polling interval is configurable.
- Historical logging works independently from realtime polling.
- Raw register data can be inspected.
- Configuration can represent more than just temperature/humidity.

