# Product Requirement Document (PRD): Real-Time IoT Sensor Monitoring Dashboard

## 1. Executive Summary
Sistem monitoring suhu dan kelembaban berbasis IoT multi-device yang membaca data dari sensor (XY-MD02 via converter USR-TCP232-304 / Modbus TCP/RTU), mengolahnya melalui Backend API, dan menyajikannya secara *real-time* pada Dashboard Web Next.js.

---

## 2. Problem Statement & Objectives
- **Problem:** Monitoring suhu dan kelembaban di area industri/laboratorium memerlukan pemantauan terus-menerus, visualisasi data real-time, historis, serta fleksibilitas dalam menambahkan sensor/device baru tanpa mengubah kode utama.
- **Objectives:**
  1. Integrasi stabil ke sensor Modbus (TCP/RTU) berbasis konfigurasi dinamis.
  2. Mengumpulkan dan menyimpan data sensor secara otomatis.
  3. Visualisasi data real-time via WebSocket dan grafik historis di Next.js.
  4. Manajemen koneksi, device, dan data point yang fleksibel.

---

## 3. System Architecture & Data Flow
```
[Sensor XY-MD02] ──(RS485)──> [USR-TCP232-304 Converter]
                                        │ (Modbus TCP / Port 502)
                                        ▼
                                [Python Collector]
                                        │ (HTTP REST POST)
                                        ▼
                               [FastAPI Backend Server]
                                        │ ├── SQLite DB (sensor_data.db)
                                        │ └── WebSocket Manager
                                        ▼
                               [Next.js Frontend Dashboard]
```

---

## 4. Key Features & Functional Requirements

### A. Collector & Modbus Engine (Python Base)
- **Protocol Support:** Modbus TCP & RTU over TCP.
- **Data Transformation:** 
  - Conversion signed 16-bit.
  - Scaling factor (misal: scaling 0.1 untuk $25.3^\circ\text{C}$).
- **Configurability:** Auto-setup koneksi default (IP `192.168.0.7:502`, Slave ID `1`, Address `1-2`).

### B. Backend API (FastAPI)
- **Endpoints Management:**
  - `/api/connections`: CRUD koneksi IP, Port, Timeout, Protocol.
  - `/api/devices`: CRUD device/sensor (Slave ID, Name, Description).
  - `/api/data-points`: CRUD parameter bacaan (Address, Function Code, Scale, Unit).
  - `/api/readings`: Query histori bacaan sensor (Filter by device, range waktu).
  - `/api/collector/data`: Ingestion endpoint dari collector engine.
- **Real-Time Streaming:** WebSocket (`/ws`) broadcast data sensor terbaru ke frontend.
- **Persistence:** SQLite Database (`connections`, `devices`, `data_points`, `sensor_readings`, `raw_logs`).

### C. Frontend Dashboard (Next.js + Tailwind CSS)
- **Dashboard Home:**
  - Real-time metric cards (Suhu & Kelembaban terbaru).
  - Status koneksi (Online/Offline indicator).
  - High-chart / Line chart riwayat bacaan.
- **Sensors Page:** List & manajemen device serta data point.
- **Connections Page:** Konfigurasi koneksi IP/Port Modbus.
- **Logs Page:** Debugging raw register Modbus & log error system.

---

## 5. Non-Functional Requirements
- **Performance:** Polling interval 1–3 detik dengan latency update UI < 500ms via WebSocket.
- **Reliability:** Collector auto-retry dan pencatatan error di `raw_logs` saat terjadi timeout/modbus error.
- **Maintainability:** Modular architecture (Separation of Concern antara IoT Collector, Backend, dan FE).

---

## 6. Success Metrics
- Zero data loss pada kondisi koneksi normal.
- Visualisasi grafik update secara smooth tanpa perlu refresh browser.
- Kemampuan menambah sensor baru hanya melalui UI tanpa restart service.
