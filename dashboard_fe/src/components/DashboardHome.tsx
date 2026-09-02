'use client';

import { useEffect, useState } from 'react';

interface Reading {
  data_point_id: number;
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
}

interface DeviceData {
  device_id: number;
  device_name: string;
  timestamp: string;
  readings: Reading[];
  status: string;
  error?: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────
const isTemp = (name: string) => /temp|suhu|temperature/i.test(name);
const isHumid = (name: string) => /hum|kelembap|kelembaban|rh/i.test(name);

function tempColor(val: number) {
  if (val >= 35) return 'text-red-500';
  if (val >= 30) return 'text-orange-400';
  if (val >= 20) return 'text-emerald-500';
  return 'text-sky-500';
}

function humidLabel(val: number) {
  if (val < 30) return { label: 'Sangat Kering', color: 'text-red-400' };
  if (val < 40) return { label: 'Kering', color: 'text-orange-400' };
  if (val <= 60) return { label: 'Optimal', color: 'text-emerald-500' };
  if (val <= 70) return { label: 'Lembap', color: 'text-sky-500' };
  return { label: 'Sangat Lembap', color: 'text-blue-600' };
}

// Simple arc / gauge path
function arcPath(pct: number, r = 52) {
  const angle = pct * 180 - 90; // -90..90
  const rad = (angle * Math.PI) / 180;
  const x = 60 + r * Math.cos(rad);
  const y = 60 + r * Math.sin(rad);
  return `M ${60 - r} 60 A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

// ─── Analog Clock Component ──────────────────────────────────────────────────
function AnalogClock({ time }: { time: Date }) {
  const seconds = time.getSeconds();
  const minutes = time.getMinutes() + seconds / 60;
  const hours = (time.getHours() % 12) + minutes / 60;

  const secDeg = (seconds / 60) * 360;
  const minDeg = (minutes / 60) * 360;
  const hourDeg = (hours / 12) * 360;

  return (
    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 shadow-inner border-2 border-slate-700/60">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* Dial Ticks */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 50 + 38 * Math.sin(angle);
          const y1 = 50 - 38 * Math.cos(angle);
          const x2 = 50 + 44 * Math.sin(angle);
          const y2 = 50 - 44 * Math.cos(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i % 3 === 0 ? '#38bdf8' : '#64748b'}
              strokeWidth={i % 3 === 0 ? '3' : '1.5'}
              strokeLinecap="round"
            />
          );
        })}

        {/* Hour Hand */}
        <line
          x1="50"
          y1="50"
          x2={50 + 22 * Math.sin((hourDeg * Math.PI) / 180)}
          y2={50 - 22 * Math.cos((hourDeg * Math.PI) / 180)}
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Minute Hand */}
        <line
          x1="50"
          y1="50"
          x2={50 + 32 * Math.sin((minDeg * Math.PI) / 180)}
          y2={50 - 32 * Math.cos((minDeg * Math.PI) / 180)}
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Second Hand */}
        <line
          x1="50"
          y1="50"
          x2={50 + 36 * Math.sin((secDeg * Math.PI) / 180)}
          y2={50 - 36 * Math.cos((secDeg * Math.PI) / 180)}
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Center Cap */}
        <circle cx="50" cy="50" r="3.5" fill="#ef4444" />
        <circle cx="50" cy="50" r="1.5" fill="#ffffff" />
      </svg>
    </div>
  );
}

export default function DashboardHome() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [connected, setConnected] = useState(false);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Clock ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Data fetch + WebSocket ───────────────────────────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const loadInitialData = async () => {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      try {
        setLoadError(null);
        const devRes = await fetch(`${api}/api/devices`);
        const backendDevices: { id: number; name: string }[] = devRes.ok
          ? await devRes.json()
          : [];

        const list: DeviceData[] = [];
        for (const dev of backendDevices) {
          const rRes = await fetch(
            `${api}/api/readings/device/${dev.id}/current`
          );
          const readings: Reading[] = rRes.ok ? await rRes.json() : [];
          list.push({
            device_id: dev.id,
            device_name: dev.name,
            timestamp:
              readings.length > 0
                ? readings[0].timestamp
                : new Date().toISOString(),
            readings,
            status: readings.length > 0 ? 'connected' : 'offline',
          });
        }
        setDevices(list);
      } catch {
        setLoadError(
          'Backend tidak dapat diakses. Pastikan server berjalan dan sensor sudah terhubung.'
        );
        setDevices([]);
      }
    };

    const connectWS = () => {
      const wsBase =
        process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      ws = new WebSocket(`${wsBase}/ws/realtime`);
      ws.onopen = () => setConnected(true);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type !== 'sensor_data') return;
          const next: DeviceData = {
            device_id: msg.device_id,
            device_name: msg.device_name,
            timestamp: msg.timestamp,
            readings: msg.readings,
            status: msg.status,
            error: msg.error,
          };
          setDevices((prev) =>
            prev.some((d) => d.device_id === next.device_id)
              ? prev.map((d) => (d.device_id === next.device_id ? next : d))
              : [...prev, next]
          );
        } catch {
          // ignore parse errors
        }
      };
      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connectWS, 3000);
      };
      ws.onerror = () => setConnected(false);
    };

    const t = setTimeout(() => {
      void loadInitialData();
      connectWS();
    }, 0);

    return () => {
      clearTimeout(t);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const primaryDevice =
    devices[selectedDeviceIndex] ?? devices[0] ?? null;

  const temperature = primaryDevice?.readings.find((r) => isTemp(r.name));
  const humidity = primaryDevice?.readings.find((r) => isHumid(r.name));

  const tempVal = temperature?.value ?? null;
  const humidVal = humidity?.value ?? null;
  const humidPct = humidVal !== null ? Math.max(0, Math.min(100, Math.round(humidVal))) : 0;

  // Temperature gauge: 0–50 °C maps to 0–100 %
  const tempPct = tempVal !== null ? Math.max(0, Math.min(1, tempVal / 50)) : 0;
  const humidGaugePct = humidPct / 100;

  const humStatus = humidVal !== null ? humidLabel(humidVal) : null;

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lastUpdated = primaryDevice?.timestamp
    ? new Date(primaryDevice.timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  // ── Status message ───────────────────────────────────────────────────────
  let statusMsg = 'Menunggu data sensor...';
  if (!connected) {
    statusMsg = 'Sensor terputus. Periksa koneksi perangkat.';
  } else if (tempVal !== null && tempVal > 35) {
    statusMsg = 'Suhu sangat tinggi! Pastikan ventilasi berjalan.';
  } else if (humidVal !== null && humidVal < 30) {
    statusMsg = 'Kelembapan sangat rendah. Pertimbangkan humidifier.';
  } else if (humidVal !== null && humidVal > 70) {
    statusMsg = 'Kelembapan tinggi. Pastikan sirkulasi udara baik.';
  } else if (connected && tempVal !== null) {
    statusMsg = 'Kondisi lingkungan normal dan stabil.';
  }

  return (
    <div className="min-h-screen bg-bg-app">
      <main className="ml-0 min-h-screen px-4 pb-20 pt-6 md:px-8 md:py-8 lg:px-10">

        {/* ── Error Banner ─────────────────────────────────────────────── */}
        {loadError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-medium">{loadError}</span>
          </div>
        )}

        {/* ── Top Header Section (Matching Diagram Layout) ────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mb-6">
          {/* Card 1: Dashboard sensor & Monitoring Sensor with status on/off */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-7 text-white shadow-lg lg:col-span-6 flex flex-col justify-between min-h-[190px]">
            <span className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <span className="absolute -bottom-10 right-20 h-36 w-36 rounded-full bg-white/5 blur-lg pointer-events-none" />

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-sky-200">
                dashboard sensor
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
                Monitoring Sensor
              </h1>
              <p className="mt-1 text-xs text-sky-100 max-w-md leading-relaxed">
                Pemantauan real-time suhu, kelembapan, dan status koneksi perangkat Modbus.
              </p>
            </div>

            {/* Bottom-right Status Badge (status on/off) */}
            <div className="flex justify-end mt-4">
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold shadow-md transition-all ${
                connected ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-white animate-pulse' : 'bg-white/80'}`} />
                <span>status: {connected ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Jumlah & nama perangkat yang aktif */}
          <div className="rounded-[2.5rem] bg-white p-6 shadow-sm border border-slate-100/80 lg:col-span-3 flex flex-col justify-between min-h-[190px]">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                jumlah &amp; nama perangkat yang aktif
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">
                  {devices.filter(d => d.status === 'connected' || d.readings.length > 0).length}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  dari {devices.length} Perangkat Aktif
                </span>
              </div>
            </div>

            {/* List / Badges of Active Devices */}
            <div className="mt-3 space-y-1.5 max-h-24 overflow-y-auto pr-1">
              {devices.length > 0 ? (
                devices.map((d) => (
                  <div key={d.device_id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700">
                    <span className="truncate max-w-[140px]">{d.device_name}</span>
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${d.status === 'connected' || d.readings.length > 0 ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 font-medium py-2">
                  Belum ada perangkat terdaftar
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Jam Analog & Jam Digital */}
          <div className="rounded-[2.5rem] bg-white p-5 shadow-sm border border-slate-100/80 lg:col-span-3 flex flex-col items-center justify-between min-h-[190px]">
            {/* Jam Analog (Top Circle) */}
            <div className="flex flex-col items-center pt-1">
              <AnalogClock time={currentTime} />
              <span className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">jam analog</span>
            </div>

            {/* Jam Digital (Bottom Pill/Box) */}
            <div className="w-full mt-2 rounded-2xl bg-slate-900 px-3 py-2 text-center text-white shadow-sm">
              <p className="font-mono text-sm font-black text-sky-400 tracking-wider">
                {formattedTime}
              </p>
              <p className="text-[10px] font-semibold text-slate-400">
                {formattedDate}
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Content Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* ══ MAIN AREA (3 cols) ══════════════════════════════════════ */}
          <div className="flex flex-col gap-6 lg:col-span-3">

            {/* ── Bento Row 1: Temp + Humidity gauges ─────────────────── */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

              {/* Temperature Card */}
              <div className="rounded-[2.5rem] bg-white p-7 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Suhu Udara</p>
                    <h2 className={`mt-1 text-5xl font-extrabold tabular-nums ${tempVal !== null ? tempColor(tempVal) : 'text-slate-300'}`}>
                      {tempVal !== null ? tempVal.toFixed(1) : '--'}
                      <span className="ml-1 text-2xl font-semibold text-slate-400">°C</span>
                    </h2>
                  </div> 
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-400">
                    {/* thermometer icon */}
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                    </svg>
                  </div>
                </div>

                {/* Semi-circle gauge */}
                <div className="relative mx-auto mt-6 flex h-[80px] w-[120px] items-end justify-center overflow-hidden">
                  <svg viewBox="0 0 120 70" className="absolute inset-0 w-full">
                    {/* Track */}
                    <path d="M 8 60 A 52 52 0 0 1 112 60" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
                    {/* Fill */}
                    <path
                      d="M 8 60 A 52 52 0 0 1 112 60"
                      fill="none"
                      stroke="url(#tempGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${tempPct * 163} 163`}
                    />
                    <defs>
                      <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="relative z-10 mb-1 text-xs font-bold text-slate-400">0–50 °C</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <span className="font-semibold text-slate-400">Sumber: {temperature?.name ?? '--'}</span>
                  <span className="font-bold text-sky-500">Real-time</span>
                </div>
              </div>

              {/* Humidity Card */}
              <div className="rounded-[2.5rem] bg-white p-7 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Kelembapan</p>
                    <h2 className="mt-1 text-5xl font-extrabold tabular-nums text-sky-500">
                      {humidVal !== null ? Math.round(humidVal) : '--'}
                      <span className="ml-1 text-2xl font-semibold text-slate-400">%</span>
                    </h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-400">
                    {/* droplet icon */}
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.5 9.5 4 13.5 4 16a8 8 0 0 0 16 0c0-2.5-2.5-6.5-8-14z"/>
                    </svg>
                  </div>
                </div>

                {/* Droplet fill bar */}
                <div className="relative mx-auto mt-6 h-28 w-20">
                  <div className="droplet-container mx-auto" style={{ width: 80, height: 104 }}>
                    <div
                      className="droplet-water"
                      style={{ transform: `scaleY(${humidGaugePct})` }}
                    >
                      <div className="water-wave" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-extrabold text-white drop-shadow">{humidPct}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <span className={`font-bold ${humStatus?.color ?? 'text-slate-400'}`}>
                    {humStatus?.label ?? '--'}
                  </span>
                  <span className="font-semibold text-slate-400">{humidity?.unit ?? '%RH'}</span>
                </div>
              </div>
            </div>

            {/* ── Bento Row 2: Device list + Reading detail ────────────── */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

              {/* Device Selector */}
              <div className="flex flex-col justify-between rounded-[2.5rem] bg-white p-6 shadow-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Perangkat Aktif</p>
                  <h3 className="mt-2 text-lg font-bold text-slate-800">
                    {primaryDevice?.device_name ?? 'Tidak ada perangkat'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {devices.length} perangkat terdaftar
                  </p>
                </div>

                {/* Dot indicators */}
                <div className="my-4 flex justify-center gap-2">
                  {devices.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDeviceIndex(idx)}
                      className={`h-2 rounded-full transition-all ${idx === selectedDeviceIndex ? 'w-6 bg-sky-500' : 'w-2 bg-slate-200'}`}
                    />
                  ))}
                  {devices.length === 0 && <span className="h-2 w-2 rounded-full bg-slate-200" />}
                </div>

                <button
                  disabled={devices.length <= 1}
                  onClick={() => setSelectedDeviceIndex((p) => (p + 1) % devices.length)}
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-40"
                >
                  Perangkat Berikutnya
                </button>
              </div>

              {/* Reading Detail Table */}
              <div className="rounded-[2.5rem] bg-white p-6 shadow-sm md:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Detail Pembacaan</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${primaryDevice?.status === 'connected' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {primaryDevice?.status ?? 'offline'}
                  </span>
                </div>

                {primaryDevice && primaryDevice.readings.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {primaryDevice.readings.map((r) => (
                      <div key={r.data_point_id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm ${isTemp(r.name) ? 'bg-orange-50 text-orange-400' : isHumid(r.name) ? 'bg-sky-50 text-sky-500' : 'bg-slate-50 text-slate-400'}`}>
                            {isTemp(r.name) ? '🌡' : isHumid(r.name) ? '💧' : '📡'}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{r.name}</span>
                        </div>
                        <span className="font-extrabold tabular-nums text-slate-800">
                          {r.value.toFixed(1)}
                          <span className="ml-0.5 text-xs font-medium text-slate-400">{r.unit ?? ''}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-28 flex-col items-center justify-center gap-2 text-slate-300">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p className="text-sm font-semibold">Belum ada data pembacaan</p>
                    <p className="text-xs text-slate-400">Pastikan sensor terhubung dan polling aktif</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ══ RIGHT PANEL (1 col) ══════════════════════════════════════ */}
          <div className="flex flex-col gap-6 lg:col-span-1">

            {/* Date & Time Card */}
            <div className="rounded-[2rem] bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Sekarang</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-slate-800">{formattedTime}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">{formattedDate}</p>
              <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                Update terakhir: <span className="font-bold text-slate-600">{lastUpdated}</span>
              </div>
            </div>

            {/* Status Message Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-sky-50 to-blue-100/60 p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                <svg className="h-7 w-7 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.5 9.5 4 13.5 4 16a8 8 0 0 0 16 0c0-2.5-2.5-6.5-8-14z"/>
                </svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Status Sensor</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{statusMsg}</p>
              <div className="mt-4 flex gap-1">
                <span className="h-1.5 w-4 rounded-full bg-sky-500" />
                <span className="h-1.5 w-1.5 rounded-full bg-sky-200" />
                <span className="h-1.5 w-1.5 rounded-full bg-sky-100" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="rounded-[2rem] bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Ringkasan</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    Suhu
                  </span>
                  <span className={`text-sm font-extrabold tabular-nums ${tempVal !== null ? tempColor(tempVal) : 'text-slate-300'}`}>
                    {tempVal !== null ? `${tempVal.toFixed(1)} °C` : '-- °C'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    Kelembapan
                  </span>
                  <span className="text-sm font-extrabold tabular-nums text-sky-600">
                    {humidVal !== null ? `${Math.round(humidVal)} %` : '-- %'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    Koneksi
                  </span>
                  <span className={`text-sm font-bold ${connected ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {connected ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    Perangkat
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {devices.length} aktif
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}