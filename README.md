# SensorHub — IoT Temperature & Humidity Monitoring Dashboard

Dashboard web untuk monitoring **suhu dan kelembaban secara real-time** dari sensor **XY-MD02** melalui komunikasi **Modbus RTU/RS485** dan converter **USR-TCP232-304**.

SensorHub menggunakan:

* **Python + FastAPI** sebagai backend dan web server
* **pymodbus** untuk komunikasi Modbus
* **React** untuk frontend
* **JSON (`db.json`)** untuk menyimpan konfigurasi master data
* **HTTP REST API** sebagai komunikasi antara frontend dan backend

Frontend tidak membutuhkan Node.js, npm, atau proses build terpisah karena aplikasi React dijalankan melalui CDN dan disajikan langsung oleh FastAPI.

---

## Fitur

### Monitoring

* Pembacaan suhu secara real-time
* Pembacaan kelembaban secara real-time
* Status koneksi sensor secara live
* Gauge suhu dan kelembaban
* Sparkline / grafik tren pembacaan
* Riwayat pembacaan selama aplikasi berjalan
* Refresh data otomatis

### Master Data

#### Master Konfigurasi Koneksi

Digunakan untuk menyimpan konfigurasi koneksi ke converter RS485-to-Ethernet.

Contoh:

* Nama koneksi
* IP address converter
* Port Modbus TCP
* Status koneksi

Satu konfigurasi koneksi dapat digunakan oleh beberapa sensor.

#### Master Setup Sensor

Digunakan untuk mendefinisikan sensor yang terhubung melalui suatu koneksi.

Contoh:

* Nama sensor
* Slave ID
* Alamat awal register
* Jumlah register
* Acuan alamat / address offset
* Status aktif/nonaktif
* Koneksi yang digunakan

Model ini memungkinkan satu converter menangani beberapa sensor melalui jaringan RS485 (**multi-drop**).

### Pengujian Sensor

* Test koneksi per sensor
* Menampilkan hasil pembacaan register
* Menampilkan status berhasil/gagal
* Membantu melakukan troubleshooting konfigurasi tanpa mengubah source code

### Penyimpanan

* Master data disimpan otomatis ke `db.json`
* Riwayat pembacaan disimpan di memory selama backend aktif
* Tidak membutuhkan database eksternal untuk menjalankan aplikasi

---

# Arsitektur Sistem

```text
┌──────────────────────┐
│   XY-MD02 Sensor     │
│   Modbus RTU / RS485 │
└──────────┬───────────┘
           │
           │ RS485
           ▼
┌──────────────────────┐
│   USR-TCP232-304     │
│   RS485 → Ethernet   │
└──────────┬───────────┘
           │
           │ Modbus TCP
           ▼
┌────────────────────────────────┐
│          Python Backend        │
│                                │
│  FastAPI                       │
│  ├── REST API                  │
│  ├── Modbus Reader             │
│  ├── Sensor Polling            │
│  ├── Configuration Manager     │
│  └── Static File Server        │
└──────────────┬─────────────────┘
               │
               │ HTTP / REST API
               ▼
┌────────────────────────────────┐
│         React Frontend         │
│                                │
│  Dashboard                     │
│  Master Koneksi                │
│  Master Sensor                 │
│  Sensor Monitoring             │
│  Test Connection               │
└────────────────────────────────┘
```

### Kenapa browser tidak langsung membaca Modbus?

Browser tidak dirancang untuk berkomunikasi langsung dengan perangkat Modbus TCP di jaringan lokal.

Karena itu:

```text
Browser
   │
   │ HTTP
   ▼
FastAPI
   │
   │ Modbus TCP
   ▼
USR-TCP232-304
   │
   │ RS485 / Modbus RTU
   ▼
XY-MD02
```

Backend Python menjadi **bridge** antara aplikasi web dan perangkat IoT.

---

# Data Flow

Ketika monitoring berjalan, prosesnya secara umum:

```text
1. Frontend meminta data monitoring
             │
             ▼
2. FastAPI mengambil konfigurasi sensor
             │
             ▼
3. Backend membuka / menggunakan koneksi Modbus TCP
             │
             ▼
4. Request dikirim ke USR-TCP232-304
             │
             ▼
5. Converter meneruskan request melalui RS485
             │
             ▼
6. XY-MD02 mengembalikan register suhu & kelembaban
             │
             ▼
7. Backend memproses nilai register
             │
             ▼
8. Backend mengubahnya menjadi data JSON
             │
             ▼
9. Frontend menampilkan data terbaru
```

---

# Komunikasi Modbus

Sensor XY-MD02 menggunakan:

* Protocol: **Modbus RTU**
* Physical layer: **RS485**
* Converter: **USR-TCP232-304**
* Backend protocol: **Modbus TCP**
* Function Code: **04 — Read Input Registers**

Secara konsep:

```text
Modbus TCP
FastAPI
   ↓
USR-TCP232-304
   ↓
Modbus RTU
   ↓
RS485
   ↓
XY-MD02
```

Backend menggunakan `pymodbus` untuk melakukan komunikasi Modbus.

> Detail register dan address offset harus mengikuti konfigurasi sensor yang digunakan. Jangan mengasumsikan semua perangkat XY-MD02 memiliki mapping register yang identik jika dokumentasi hardware yang digunakan berbeda.

---

# Format Data Monitoring

Backend mengirim data monitoring ke frontend menggunakan JSON.

Contoh struktur:

```json
{
  "sensor_id": 1,
  "sensor_name": "Sensor Ruang 1",
  "temperature": 27.5,
  "humidity": 68.2,
  "status": "online",
  "timestamp": "2026-08-21T11:00:00"
}
```

Frontend tidak perlu mengetahui detail komunikasi Modbus.

Frontend hanya berinteraksi dengan API backend.

---

# Struktur Proyek

```text
SensorHub/
│
├── backend.py
│   └── FastAPI server
│       ├── REST API
│       ├── Modbus communication
│       ├── Sensor polling
│       └── Static file serving
│
├── requirements.txt
│
├── static/
│   └── index.html
│       └── React frontend
│
├── db.json
│   └── Auto-generated master configuration
│
└── README.md
```

`db.json` akan dibuat otomatis ketika aplikasi pertama kali dijalankan jika file tersebut belum tersedia.

---

# Instalasi

Pastikan Python **3.10 atau lebih baru** sudah terinstall.

Clone repository:

```bash
git clone https://github.com/<username>/<nama-repo>.git
cd <nama-repo>
```

Install dependency:

```bash
pip install -r requirements.txt
```

Jalankan backend:

```bash
python backend.py
```

Setelah server berhasil berjalan, buka:

```text
http://localhost:8000
```

---

# Konfigurasi Awal

Pada first run, aplikasi akan membuat `db.json` dengan konfigurasi awal.

Konfigurasi selanjutnya dilakukan melalui dashboard dan **tidak perlu mengubah source code**.

## 1. Konfigurasi Koneksi

Masukkan konfigurasi converter USR-TCP232-304.

Contoh:

```text
Name : Converter Utama
IP   : 192.168.1.100
Port : 502
```

Nilai IP dan port harus disesuaikan dengan konfigurasi converter di jaringan pengguna.

## 2. Setup Sensor

Tambahkan sensor yang terhubung ke converter.

Contoh:

```text
Name        : Sensor Ruang 1
Slave ID    : 1
Start Addr  : <sesuai dokumentasi sensor>
Address Mode : <sesuai kebutuhan>
```

Jika beberapa sensor menggunakan converter yang sama:

```text
                    ┌── Sensor ID 1
                    │
USR-TCP232-304 ─────┼── Sensor ID 2
                    │
                    └── Sensor ID 3
```

Setiap sensor harus memiliki **Slave ID yang berbeda**.

---

# Test Connection

Setiap sensor memiliki fitur **Test Connection**.

Prosesnya:

```text
Frontend
   │
   │ POST / API test sensor
   ▼
FastAPI
   │
   │ Modbus request
   ▼
Converter
   │
   ▼
Sensor
   │
   ▼
Response
   │
   ▼
FastAPI
   │
   ▼
Frontend
```

Fitur ini digunakan untuk memastikan:

* IP converter benar
* Port dapat diakses
* Slave ID benar
* Register address benar
* Sensor merespons request Modbus

---

# Hardware

Hardware utama:

### Sensor

**XY-MD02**

* Temperature sensor
* Humidity sensor
* Modbus RTU
* RS485
* SHT20-based sensor

### Converter

**USR-TCP232-304**

* RS485 to Ethernet
* Menjembatani Modbus RTU ke jaringan Ethernet
* Digunakan oleh backend sebagai endpoint komunikasi Modbus TCP

---

# Kompatibilitas

Arsitektur SensorHub tidak terbatas pada XY-MD02.

Sensor Modbus lain dapat digunakan selama:

1. Sensor dapat berkomunikasi melalui RS485.
2. Converter dapat meneruskan komunikasi Modbus RTU melalui TCP.
3. Register sensor dapat dikonfigurasi melalui master sensor.
4. Backend dapat membaca register menggunakan function code yang sesuai.
5. Format register dapat diterjemahkan menjadi nilai sensor oleh backend.

Jika mapping register atau format data berbeda, bagian parser pembacaan sensor mungkin perlu disesuaikan.

---

# Penyimpanan Data

SensorHub menggunakan dua jenis penyimpanan.

## Master Data

Disimpan secara permanen di:

```text
db.json
```

Digunakan untuk:

* Konfigurasi koneksi
* Konfigurasi sensor
* Relasi sensor dengan koneksi

## Riwayat Monitoring

Data monitoring sementara disimpan di memory backend.

Artinya:

```text
Backend running
      │
      ├── pembacaan sensor
      ├── histori
      └── monitoring
```

Ketika backend dihentikan atau restart, histori in-memory akan hilang.

Konfigurasi master data tetap tersimpan di `db.json`.

---

# Real-Time Monitoring

Untuk monitoring dengan interval pendek, backend melakukan polling sensor secara berkala.

Contoh:

```text
Sensor
  │
  ├── Read
  │
  ├── Wait interval
  │
  ├── Read
  │
  ├── Wait interval
  │
  └── ...
```

Interval polling sebaiknya dikonfigurasi dengan mempertimbangkan:

* jumlah sensor
* kemampuan converter
* response time sensor
* stabilitas jaringan
* kebutuhan monitoring

Jangan melakukan polling terlalu agresif hanya karena "real-time" terdengar keren. Sensor juga bukan CPU Ryzen yang bisa disuruh sprint tiap 1 ms.

---

# Troubleshooting

## Sensor Offline

Periksa:

1. Converter menyala.
2. IP converter benar.
3. Port Modbus TCP benar.
4. Backend dapat mengakses IP converter.
5. Kabel RS485 terhubung dengan benar.
6. Slave ID sesuai dengan sensor.
7. Sensor mendapatkan power.
8. Register address sesuai dokumentasi.
9. Address offset / acuan alamat sesuai konfigurasi.

## Connection Refused

Kemungkinan:

* IP converter salah
* Port salah
* Converter tidak aktif
* Converter tidak berada di jaringan yang sama
* Firewall memblokir koneksi
* Modbus TCP pada converter belum diaktifkan

## Sensor Merespons Tetapi Nilainya Salah

Periksa:

* Register address
* Function code
* Address offset
* Data type
* Scaling factor
* Urutan register

Nilai register mentah tidak selalu sama dengan nilai engineering yang ditampilkan sensor.

---

# Catatan Keamanan

Aplikasi ini dirancang terutama untuk penggunaan jaringan lokal.

Jika backend ingin diakses dari jaringan lain:

* Jangan langsung expose port FastAPI ke internet.
* Gunakan firewall.
* Batasi akses jaringan.
* Gunakan reverse proxy jika diperlukan.
* Tambahkan authentication/authorization jika aplikasi digunakan oleh banyak pengguna.
* Jangan menyimpan credential perangkat secara sembarangan di repository.

`db.json` juga sebaiknya tidak di-commit jika nantinya berisi credential atau informasi jaringan yang sensitif.

---

# Teknologi

| Komponen              | Teknologi      |
| --------------------- | -------------- |
| Backend               | Python         |
| Web Framework         | FastAPI        |
| Modbus                | pymodbus       |
| Frontend              | React          |
| Frontend Runtime      | Browser + CDN  |
| API                   | REST / HTTP    |
| Configuration Storage | JSON           |
| Sensor Protocol       | Modbus RTU     |
| Network Protocol      | Modbus TCP     |
| Physical Interface    | RS485          |
| Converter             | USR-TCP232-304 |

---

# Prinsip Arsitektur

SensorHub menggunakan prinsip:

```text
Hardware
   ↓
Modbus
   ↓
Python Backend
   ↓
REST API
   ↓
React UI
```

Frontend **tidak berkomunikasi langsung dengan hardware**.

Backend bertanggung jawab terhadap:

* komunikasi Modbus
* polling sensor
* parsing register
* koneksi hardware
* penyimpanan konfigurasi
* penyediaan API

Frontend bertanggung jawab terhadap:

* visualisasi data
* dashboard
* konfigurasi master data
* test connection
* interaksi pengguna

Dengan pemisahan tersebut, perubahan UI tidak harus mengubah logic komunikasi sensor dan sebaliknya.


Proyek pribadi/internal.

Gunakan atau distribusikan sesuai kebutuhan proyek dan hardware yang digunakan.
