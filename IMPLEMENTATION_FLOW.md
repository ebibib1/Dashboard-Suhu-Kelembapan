# SensorHub — Implementation Flow

Dokumen ini merangkum pekerjaan yang telah dilakukan pada project SensorHub, alur sistem, hasil pengujian, serta status perubahan terakhir.

## 1. Pemahaman Project

Dokumentasi utama yang telah dibaca:

- `README.md`
- `PRD.md`
- `IoT_Modbus_Integration_Agent_Context.md`
- `IoT/design (2).md`
- `dashboard_fe/README.md`
- `dashboard_fe/AGENTS.md`
- `dashboard_fe/CLAUDE.md`

Project ini adalah dashboard monitoring suhu dan kelembaban dari sensor XY-MD02 melalui Modbus RTU/RS485 dan converter USR-TCP232-304.

Arsitektur target:

```text
XY-MD02 Sensor
      |
      | RS485 / Modbus RTU
      v
USR-TCP232-304
      |
      | Modbus TCP
      v
Python Collector / Modbus Service
      |
      | HTTP REST
      v
FastAPI Backend
      |
      +--> SQLite Database
      +--> WebSocket Realtime
      |
      | HTTP / WebSocket
      v
Next.js Frontend Dashboard
```

Tanggung jawab utama:

- Python/Modbus Service: komunikasi hardware, pembacaan register, parsing, dan polling.
- FastAPI Backend: API, validasi, scheduler, persistence, historical readings, raw logs, dan realtime stream.
- Next.js Frontend: dashboard, konfigurasi koneksi/sensor, grafik, status koneksi, scheduler, dan log viewer.

## 2. Pemeriksaan Awal

Frontend diperiksa untuk mengetahui struktur halaman dan komponen:

- `DashboardHome`
- `MetricCard`
- `Sidebar`
- Halaman `Connections`
- Halaman `Sensors`
- Halaman `Scheduler`
- Halaman `Logs`

Backend dan database lokal juga diperiksa. Database berisi konfigurasi awal:

- 1 koneksi Modbus TCP.
- 1 device XY-MD02.
- 2 data point: Temperature dan Humidity.
- Belum ada historical reading saat pengujian awal.

## 3. Testing Awal dengan Data Dummy

Karena database awal belum memiliki readings, dibuat salinan database sementara di folder temporary sistem.

Data dummy yang digunakan:

- 11 titik data temperature.
- 11 titik data humidity.
- Total 22 historical readings.
- Nilai temperature dan humidity dibuat bervariasi agar grafik dapat diuji.

Flow testing:

```text
Salin database utama
      |
      v
Tambahkan readings dummy ke database salinan
      |
      v
Jalankan FastAPI pada port 8000
      |
      v
Jalankan Next.js pada port 3000
      |
      v
Frontend meminta current readings dan data master
      |
      v
Backend mengembalikan data sensor dummy
      |
      v
Route UI diuji melalui HTTP
      |
      v
Server dan database dummy dihentikan/dihapus
```

Endpoint backend yang berhasil diuji:

- `GET /health` — berhasil.
- `GET /api/readings/current` — berhasil mengembalikan temperature dan humidity.
- `GET /api/connections` — berhasil.
- `GET /api/devices` — berhasil.
- `GET /api/scheduler` — berhasil.
- `GET /api/readings/raw-logs` — berhasil.

Seluruh route frontend juga merespons `200 OK`:

- `/`
- `/connections`
- `/sensors`
- `/scheduler`
- `/logs`

## 4. Perbaikan Bug Frontend

### Endpoint Logs

Frontend sebelumnya memanggil:

```text
/api/logs/raw
```

Backend menyediakan endpoint:

```text
/api/readings/raw-logs
```

Frontend diperbaiki agar menggunakan endpoint backend yang benar.

### React Hooks Lint Error

Beberapa halaman memiliki pemanggilan loader langsung dari `useEffect`, yang dilaporkan oleh aturan lint React.

Halaman yang diperbaiki:

- `Connections`
- `Sensors`
- `Scheduler`
- `Logs`

Pemanggilan data diberi scheduling dan cleanup timer agar tidak menghasilkan error lint.

### Cleanup Code

Beberapa item yang tidak digunakan dihapus:

- State WebSocket yang tidak digunakan.
- Type `DataPoint` yang tidak digunakan.
- Import `useEffect` yang tidak digunakan.
- Setter state yang tidak digunakan.

## 5. Pengembangan Tampilan Dashboard

Dashboard kemudian dikembangkan agar lebih sesuai dengan `IoT/design (2).md`.

### Dashboard Hero Chart

Ditambahkan grafik tren suhu menggunakan SVG native.

Flow data chart:

```text
GET /api/readings/current
      |
      v
Ambil device dan current readings
      |
      v
GET /api/readings/device/{id}/history?limit=60
      |
      v
Kelompokkan history berdasarkan data_point_id
      |
      v
Render SVG line chart
```

Grafik menggunakan:

- Normalisasi nilai minimum dan maksimum.
- Fill gradient transparan.
- Line chart responsif.
- Maksimal 60 titik pembacaan.

### Realtime Chart Update

Saat WebSocket menerima pesan `sensor_data`:

```text
WebSocket message
      |
      v
Parse sensor readings
      |
      v
Update current device state
      |
      v
Tambahkan value baru ke history
      |
      v
Batasi history menjadi 60 titik
      |
      v
Render ulang chart dan metric card
```

### Humidity Gauge

Ditambahkan gauge kelembaban berbasis CSS `conic-gradient`.

Gauge membatasi nilai visual ke rentang 0–100% agar tetap aman secara tampilan.

### Metric Card dan Sparkline

`MetricCard` sekarang mendukung:

- Status koneksi.
- Unit data.
- Sparkline SVG.
- Normalisasi sparkline berdasarkan nilai min/max.
- Aksen warna teal, pink, atau orange.

### Responsive Layout

Perubahan responsive yang dibuat:

- Desktop menggunakan sidebar vertikal fixed.
- Mobile menggunakan navigasi horizontal di bagian atas.
- Konten dashboard tidak lagi selalu menggunakan margin kiri 256px pada mobile.
- Grid dashboard berubah dari satu kolom menjadi beberapa kolom sesuai breakpoint.
- Chart dan card menggunakan ukuran tinggi/lebar yang fleksibel.

## 6. Testing Setelah Perubahan

Perintah yang dijalankan dari folder `dashboard_fe`:

```bash
npm run lint
npm run build
```

Hasil:

- ESLint: berhasil tanpa error maupun warning.
- Next.js production build: berhasil.
- Semua route berhasil diprerender:

```text
/
/connections
/logs
/scheduler
/sensors
```

Pemeriksaan tambahan:

```bash
git diff --check
```

Hasil: tidak ditemukan whitespace error.

## 7. Commit dan Push

### Commit Pertama

Perbaikan lint dan endpoint Logs:

```text
132c469 fix frontend lint and logs endpoint
```

Commit ini telah dipush ke `origin/main`.

### Commit Kedua

Penambahan chart, gauge, sparkline, dan responsive layout:

```text
40c6dcc add responsive sensor dashboard visuals
```

Commit ini telah dipush ke `origin/main`.

Remote repository:

```text
https://github.com/ebibib1/Dashboard-Suhu-Kelembapan
```

Branch:

```text
main
```

## 8. Perubahan yang Tidak Diikutkan ke Commit

Beberapa perubahan dan file telah ada di working tree, tetapi sengaja tidak diikutkan karena bukan bagian dari pekerjaan frontend dashboard:

- `backend/modbus_service.py`
- `IoT/`
- `PRD.md`
- `sensor_monitor.db`

Perubahan tersebut dibiarkan tetap aman dan tidak ditimpa.

## 9. Kondisi Saat Ini

Kondisi frontend saat ini:

- Dashboard sudah memiliki current metric.
- Dashboard sudah memiliki historical trend chart.
- Dashboard sudah memiliki humidity gauge.
- Metric card sudah memiliki sparkline.
- WebSocket dapat memperbarui current state dan histori chart.
- Layout sudah lebih responsif untuk desktop dan mobile.
- Endpoint Logs sudah sesuai dengan backend.
- Lint dan production build berhasil.

## 10. Flow Penggunaan Dashboard

```text
User membuka Dashboard
      |
      v
Next.js render layout dan Sidebar
      |
      v
Dashboard meminta current readings ke FastAPI
      |
      v
FastAPI mengambil latest reading dari SQLite
      |
      v
Dashboard menampilkan metric suhu dan humidity
      |
      v
Dashboard meminta historical readings
      |
      v
Dashboard membuat line chart dan sparkline
      |
      v
Dashboard membuka WebSocket realtime
      |
      v
Collector/backend mengirim sensor_data
      |
      v
Dashboard memperbarui card, gauge, dan chart
```

Untuk konfigurasi:

```text
User membuka Connections atau Sensors
      |
      v
Frontend mengambil master data dari FastAPI
      |
      v
User mengisi form konfigurasi
      |
      v
Frontend mengirim POST/PUT ke backend
      |
      v
Backend memvalidasi dan menyimpan ke database
      |
      v
Frontend melakukan refresh data master
```

Untuk monitoring hardware:

```text
Scheduler menjalankan polling
      |
      v
Modbus Service membuka koneksi
      |
      v
Request register dikirim ke converter
      |
      v
Sensor mengembalikan register
      |
      v
Backend/collector melakukan decoding dan scaling
      |
      v
Current state dikirim melalui WebSocket
      |
      v
Historical reading disimpan sesuai interval logging
```