"""
Dashboard Suhu & Kelembaban - Multi Sensor (XY-MD02 via USR-TCP232-304)
============================================================================
Mendukung 2 sensor dengan IP berbeda sekaligus. Alur konfigurasi dibuat mirip
Modbus Poll: Menu 1 "Konfigurasi Koneksi" (IP/port/timeout) lalu Menu 2
"Setup Sensor" (slave ID, byte rate, alamat register).

CARA PAKAI:
    pip install streamlit pymodbus pandas
    streamlit run dashboard.py
"""

import time
from dataclasses import dataclass, field
from datetime import datetime

import pandas as pd
import streamlit as st
from pymodbus.client import ModbusTcpClient

# ---------------------------------------------------------------------------
# Styling - tema modern, kartu putih di atas latar abu-abu, aksen hijau
# ---------------------------------------------------------------------------
st.set_page_config(page_title="Dashboard Suhu & Kelembaban", page_icon="🌡️", layout="wide")

st.markdown(
    """
    <style>
    .stApp { background-color: #f4f6f5; }
    div[data-testid="stMetric"] {
        background-color: #ffffff;
        border-radius: 16px;
        padding: 16px 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        border: 1px solid #ecefee;
    }
    div[data-testid="stMetricLabel"] { font-weight: 600; color: #3a4a43; }
    div[data-testid="stMetricValue"] { color: #16a34a; }
    .sensor-card {
        background-color: #ffffff;
        border-radius: 18px;
        padding: 20px 22px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        border: 1px solid #ecefee;
        margin-bottom: 14px;
    }
    .status-dot-on { color: #16a34a; font-weight: 600; }
    .status-dot-off { color: #dc2626; font-weight: 600; }
    h1, h2, h3 { color: #1f2a25; }
    section[data-testid="stSidebar"] { background-color: #ffffff; }
    </style>
    """,
    unsafe_allow_html=True,
)


# ---------------------------------------------------------------------------
# Model konfigurasi per sensor
# ---------------------------------------------------------------------------
@dataclass
class SensorConfig:
    nama: str = "Sensor"
    aktif: bool = False
    # --- Menu 1: Konfigurasi Koneksi ---
    tipe_koneksi: str = "TCP"          # TCP (RTU serial belum didukung di versi ini)
    ip: str = "192.168.0.7"
    port: int = 502
    timeout: float = 3.0
    # --- Menu 2: Setup Sensor ---
    byte_rate: int = 9600               # informasi baud rate serial di sisi converter
    slave_id: int = 1
    start_address: int = 1              # terbukti berhasil di pengujian sebelumnya
    acuan_modbuspoll: str = "Sesuai datasheet (mulai dari 0)"
    register_count: int = 2


def to_signed_16(value: int) -> int:
    return value - 65536 if value > 32767 else value


def read_sensor(cfg: SensorConfig):
    """Baca suhu & kelembaban dari 1 sensor sesuai konfigurasinya."""
    out = {"ok": False, "suhu": None, "kelembaban": None, "raw": None, "error": None}

    # Terapkan offset alamat kalau user pilih "acuan Modbus Poll" (mulai dari 1)
    actual_address = cfg.start_address
    if cfg.acuan_modbuspoll.startswith("Sesuai Modbus Poll"):
        actual_address += 1

    client = ModbusTcpClient(cfg.ip, port=cfg.port, timeout=cfg.timeout)
    try:
        if not client.connect():
            out["error"] = "Gagal membuka koneksi TCP ke converter."
            return out

        result = client.read_input_registers(
            address=actual_address, count=cfg.register_count, device_id=cfg.slave_id
        )

        if result.isError():
            out["error"] = f"Device merespon error: {result}"
            return out

        regs = result.registers
        if len(regs) < 2:
            out["error"] = f"Register yang kembali cuma {len(regs)}, harusnya 2."
            return out

        raw_temp, raw_hum = regs[0], regs[1]
        out["ok"] = True
        out["raw"] = regs
        out["suhu"] = to_signed_16(raw_temp) / 10.0
        out["kelembaban"] = raw_hum / 10.0
        return out
    except Exception as exc:  # noqa: BLE001
        out["error"] = f"{type(exc).__name__}: {exc}"
        return out
    finally:
        client.close()


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------
if "configs" not in st.session_state:
    st.session_state.configs = {
        "sensor_1": SensorConfig(nama="Sensor 1", ip="192.168.0.7", slave_id=1),
        "sensor_2": SensorConfig(nama="Sensor 2", ip="192.168.0.7", slave_id=2),
    }

if "history" not in st.session_state:
    st.session_state.history = {
        "sensor_1": pd.DataFrame(columns=["waktu", "suhu", "kelembaban"]),
        "sensor_2": pd.DataFrame(columns=["waktu", "suhu", "kelembaban"]),
    }

if "last_reading" not in st.session_state:
    st.session_state.last_reading = {"sensor_1": None, "sensor_2": None}

if "monitoring" not in st.session_state:
    st.session_state.monitoring = False


# ---------------------------------------------------------------------------
# Sidebar - konfigurasi 2 sensor, masing-masing 2 menu (kayak Modbus Poll)
# ---------------------------------------------------------------------------
with st.sidebar:
    st.title("⚙️ Konfigurasi Sensor")
    st.caption("Atur sampai 2 sensor dengan IP berbeda")

    tab1, tab2 = st.tabs(["🌡️ Sensor 1", "🌡️ Sensor 2"])

    for tab, key in [(tab1, "sensor_1"), (tab2, "sensor_2")]:
        cfg = st.session_state.configs[key]
        with tab:
            cfg.nama = st.text_input("Nama sensor", value=cfg.nama, key=f"{key}_nama")
            cfg.aktif = st.toggle("Aktifkan sensor ini", value=cfg.aktif, key=f"{key}_aktif")

            with st.expander("🔌 Menu 1: Konfigurasi Koneksi", expanded=True):
                cfg.tipe_koneksi = st.selectbox(
                    "Type Koneksi", ["TCP"], index=0, key=f"{key}_tipe",
                    help="RTU serial langsung belum didukung di versi ini."
                )
                cfg.ip = st.text_input("Koneksi (IP Address)", value=cfg.ip, key=f"{key}_ip")
                cfg.port = st.number_input(
                    "Port", value=cfg.port, min_value=1, max_value=65535, key=f"{key}_port"
                )
                cfg.timeout = st.number_input(
                    "Timeout (detik)", value=cfg.timeout, min_value=1.0, max_value=30.0,
                    step=1.0, key=f"{key}_timeout"
                )

            with st.expander("📟 Menu 2: Setup Sensor", expanded=True):
                cfg.byte_rate = st.selectbox(
                    "Byte Rate (baud, info converter)",
                    [1200, 2400, 4800, 9600, 19200, 38400],
                    index=[1200, 2400, 4800, 9600, 19200, 38400].index(cfg.byte_rate),
                    key=f"{key}_baud",
                )
                cfg.slave_id = st.number_input(
                    "Slave ID", value=cfg.slave_id, min_value=1, max_value=247, key=f"{key}_slave"
                )
                cfg.start_address = st.number_input(
                    "Alamat Awal (sesuai datasheet)", value=cfg.start_address, min_value=0,
                    key=f"{key}_addr"
                )
                cfg.acuan_modbuspoll = st.selectbox(
                    "Acuan Alamat",
                    ["Sesuai datasheet (mulai dari 0)", "Sesuai Modbus Poll (mulai dari 1)"],
                    index=0 if cfg.acuan_modbuspoll.startswith("Sesuai datasheet") else 1,
                    key=f"{key}_acuan",
                    help="Beberapa converter/device merespon 1 alamat lebih tinggi dari datasheet. "
                         "Kalau data gagal terbaca, coba ganti opsi ini.",
                )

            if st.button("🔍 Uji koneksi sekarang", key=f"{key}_test", use_container_width=True):
                with st.spinner("Menguji koneksi..."):
                    test_result = read_sensor(cfg)
                if test_result["ok"]:
                    st.success(
                        f"Berhasil! Suhu {test_result['suhu']:.1f}°C, "
                        f"Kelembaban {test_result['kelembaban']:.1f}%RH"
                    )
                else:
                    st.error(f"Gagal: {test_result['error']}")

    st.divider()
    poll_interval = st.slider("Interval baca (detik)", min_value=1, max_value=30, value=3)
    st.session_state.monitoring = st.toggle(
        "▶️ Mulai monitoring semua sensor aktif", value=st.session_state.monitoring
    )

    if st.button("🗑️ Bersihkan semua riwayat", use_container_width=True):
        for key in st.session_state.history:
            st.session_state.history[key] = pd.DataFrame(columns=["waktu", "suhu", "kelembaban"])
        st.rerun()


# ---------------------------------------------------------------------------
# Main area
# ---------------------------------------------------------------------------
st.title("🌡️ Dashboard Suhu & Kelebapan")
st.caption("Monitoring multi-sensor XY-MD02 via converter USR-TCP232-304")

active_keys = [k for k, c in st.session_state.configs.items() if c.aktif]

if not active_keys:
    st.info("Belum ada sensor yang diaktifkan. Nyalakan toggle 'Aktifkan sensor ini' di sidebar.")
else:
    # --- Baca semua sensor aktif kalau monitoring nyala ---
    if st.session_state.monitoring:
        for key in active_keys:
            cfg = st.session_state.configs[key]
            reading = read_sensor(cfg)
            st.session_state.last_reading[key] = reading
            if reading["ok"]:
                now = datetime.now()
                new_row = pd.DataFrame(
                    [{"waktu": now, "suhu": reading["suhu"], "kelembaban": reading["kelembaban"]}]
                )
                st.session_state.history[key] = pd.concat(
                    [st.session_state.history[key], new_row], ignore_index=True
                ).tail(500)

    # --- Kartu ringkasan tiap sensor aktif, berdampingan ---
    cols = st.columns(len(active_keys))
    for col, key in zip(cols, active_keys):
        cfg = st.session_state.configs[key]
        reading = st.session_state.last_reading.get(key)
        hist = st.session_state.history[key]

        with col:
            st.markdown('<div class="sensor-card">', unsafe_allow_html=True)
            status_html = (
                '<span class="status-dot-on">🟢 Terhubung</span>'
                if reading and reading["ok"]
                else '<span class="status-dot-off">🔴 Terputus</span>'
                if reading
                else '<span>⚪ Belum ada data</span>'
            )
            st.markdown(f"### {cfg.nama}")
            st.markdown(f"{status_html} &nbsp;·&nbsp; `{cfg.ip}:{cfg.port}`", unsafe_allow_html=True)

            if reading and not reading["ok"]:
                st.error(reading["error"])

            if not hist.empty:
                last = hist.iloc[-1]
                m1, m2 = st.columns(2)
                m1.metric("Suhu", f"{last['suhu']:.1f} °C")
                m2.metric("Kelembaban", f"{last['kelembaban']:.1f} %RH")
                st.caption(f"Update terakhir: {last['waktu'].strftime('%H:%M:%S')} • {len(hist)} data terekam")
                st.line_chart(hist.set_index("waktu")[["suhu", "kelembaban"]], height=180)
            else:
                st.caption("Belum ada data terekam.")

            with st.expander("🔧 Debug raw register"):
                st.write(reading["raw"] if reading else None)

            st.markdown("</div>", unsafe_allow_html=True)

    # --- Tabel gabungan & download ---
    st.divider()
    st.subheader("📋 Data Terbaru (gabungan)")
    combined = []
    for key in active_keys:
        df = st.session_state.history[key].tail(10).copy()
        df["sensor"] = st.session_state.configs[key].nama
        combined.append(df)
    if combined:
        combined_df = pd.concat(combined, ignore_index=True).sort_values("waktu", ascending=False)
        st.dataframe(combined_df, use_container_width=True, hide_index=True)

        csv_data = combined_df.to_csv(index=False).encode("utf-8")
        st.download_button(
            "⬇️ Download riwayat gabungan (CSV)",
            data=csv_data,
            file_name=f"suhu_kelembaban_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
            mime="text/csv",
        )

    if st.session_state.monitoring:
        time.sleep(int(poll_interval))
        st.rerun()