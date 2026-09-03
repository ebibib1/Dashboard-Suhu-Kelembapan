'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

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

// ─── Helpers ────────────────────────────────────────────────────────────────
const isTemp = (name: string) => /temp|suhu|temperature/i.test(name);
const isHumid = (name: string) => /hum|kelembap|kelembaban|rh/i.test(name);
const READING_STALE_MS = 15_000;

function hasFreshReading(readings: Reading[]) {
  if (!readings.length) return false;
  const timestamp = new Date(readings[0].timestamp).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= READING_STALE_MS;
}

function tempStatus(val: number) {
  if (val >= 35) return { label: 'Tinggi / Panas', color: 'border-rose-500 bg-rose-50 text-rose-700', badge: 'off' };
  if (val >= 28) return { label: 'Agak Hangat', color: 'border-amber-500 bg-amber-50 text-amber-700', badge: 'warning' };
  if (val >= 18) return { label: 'Optimal / Normal', color: 'border-emerald-500 bg-emerald-50 text-emerald-700', badge: 'normal' };
  return { label: 'Dingin', color: 'border-sky-500 bg-sky-50 text-sky-700', badge: 'normal' };
}

function humidStatus(val: number) {
  if (val < 30) return { label: 'Kering', color: 'border-amber-500 bg-amber-50 text-amber-700', badge: 'warning' };
  if (val <= 60) return { label: 'Optimal / Ideal', color: 'border-emerald-500 bg-emerald-50 text-emerald-700', badge: 'normal' };
  if (val <= 75) return { label: 'Lembap', color: 'border-sky-500 bg-sky-50 text-sky-700', badge: 'normal' };
  return { label: 'Sangat Lembap', color: 'border-blue-600 bg-blue-50 text-blue-800', badge: 'warning' };
}

// ─── Compact Simplified Clock ───────────────────────────────────────────────
function CompactAnalogClock({ time }: { time: Date }) {
  const seconds = time.getSeconds();
  const minutes = time.getMinutes() + seconds / 60;
  const hours = (time.getHours() % 12) + minutes / 60;

  const secDeg = (seconds / 60) * 360;
  const minDeg = (minutes / 60) * 360;
  const hourDeg = (hours / 12) * 360;

  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 shadow-inner border-2 border-slate-700/80">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* Ticks */}
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
              strokeWidth={i % 3 === 0 ? '4' : '2'}
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
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Minute Hand */}
        <line
          x1="50"
          y1="50"
          x2={50 + 32 * Math.sin((minDeg * Math.PI) / 180)}
          y2={50 - 32 * Math.cos((minDeg * Math.PI) / 180)}
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Second Hand */}
        <line
          x1="50"
          y1="50"
          x2={50 + 36 * Math.sin((secDeg * Math.PI) / 180)}
          y2={50 - 36 * Math.cos((secDeg * Math.PI) / 180)}
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Center Cap */}
        <circle cx="50" cy="50" r="4" fill="#ef4444" />
        <circle cx="50" cy="50" r="1.5" fill="#ffffff" />
      </svg>
    </div>
  );
}

// ─── Dynamic Gauge Card (Speedometer Style) ─────────────────────────────────
function SpeedometerGauge({
  title,
  value,
  unit,
  subtitle,
  currentVal,
  minVal = 0,
  maxVal = 100,
}: {
  title: string;
  value: string;
  unit: string;
  subtitle: string;
  currentVal: number;
  minVal?: number;
  maxVal?: number;
}) {
  const pct = Math.max(0, Math.min(1, (currentVal - minVal) / (maxVal - minVal)));
  const angle = -120 + pct * 240; // -120deg to +120deg
  const rad = (angle * Math.PI) / 180;
  const needleX = 60 + 36 * Math.sin(rad);
  const needleY = 60 - 36 * Math.cos(rad);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 truncate">{title}</h3>
        <span className="text-[10px] font-semibold text-slate-400">Live</span>
      </div>

      {/* Main Value Display */}
      <div className="text-center my-1">
        <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">{value}</span>
        <span className="ml-1 text-xs font-bold text-slate-500">{unit}</span>
      </div>

      {/* Speedometer Arc & Needle */}
      <div className="relative mx-auto my-1 flex h-[95px] w-[150px] items-center justify-center">
        <svg viewBox="0 0 120 95" className="w-full h-full">
          {/* Background Track */}
          <path d="M 20 80 A 46 46 0 1 1 100 80" fill="none" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round" />

          {/* Green Zone (Normal) */}
          <path d="M 20 80 A 46 46 0 0 1 65 14" fill="none" stroke="#22c55e" strokeWidth="12" />

          {/* Yellow Zone (Warning) */}
          <path d="M 65 14 A 46 46 0 0 1 92 35" fill="none" stroke="#eab308" strokeWidth="12" />

          {/* Red Zone (Alert) */}
          <path d="M 92 35 A 46 46 0 0 1 100 80" fill="none" stroke="#ef4444" strokeWidth="12" />

          {/* Center Hub */}
          <circle cx="60" cy="60" r="7" fill="#0f172a" />

          {/* Needle */}
          <line x1="60" y1="60" x2={needleX} y2={needleY} stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="60" r="3" fill="#ffffff" />
        </svg>
      </div>

      <div className="text-center pt-2 border-t border-slate-100 mt-2">
        <span className="text-[11px] font-medium text-slate-500 truncate block">{subtitle}</span>
      </div>
    </div>
  );
}

// ─── Dynamic Sensor Circle Badge (Adapts to any sensor) ─────────────────────
function DynamicSensorBadge({
  name,
  value,
  unit,
  statusLabel,
  isOnline = true,
}: {
  name: string;
  value: number | string;
  unit: string;
  statusLabel: string;
  isOnline?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between items-center text-center h-full">
      <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <h4 className="text-xs font-bold text-slate-800 truncate" title={name}>{name}</h4>
        <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
      </div>

      {/* Circle Badge */}
      <div
        className={`my-2 flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 shadow-inner transition-transform hover:scale-105 ${
          isOnline
            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800'
            : 'border-slate-300 bg-slate-100 text-slate-400'
        }`}
      >
        <span className="text-base font-black tracking-tight tabular-nums">{value}</span>
        <span className="text-[10px] font-bold uppercase text-slate-500">{unit}</span>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 w-full text-center">
        <span className="text-[10px] font-bold text-slate-600 block truncate">{statusLabel}</span>
      </div>
    </div>
  );
}

// ─── Main Dynamic IoT Sensor Dashboard ──────────────────────────────────────
export default function DashboardHome() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Clock tick
  useEffect(() => {
    setCurrentTime(new Date());
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Backend API + WebSocket data polling
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
          const rRes = await fetch(`${api}/api/readings/device/${dev.id}/current`);
          const readings: Reading[] = rRes.ok ? await rRes.json() : [];
          const fresh = hasFreshReading(readings);
          list.push({
            device_id: dev.id,
            device_name: dev.name,
            timestamp: readings.length > 0 ? readings[0].timestamp : new Date().toISOString(),
            readings: fresh ? readings : [],
            status: fresh ? 'connected' : 'offline',
          });
        }
        setDevices(list);
      } catch {
        setLoadError('Backend tidak terhubung. Menampilkan sensor default (Suhu & Kelembapan).');
        // Fallback simulation device if backend is offline
        setDevices([
          {
            device_id: 1,
            device_name: 'Modbus Sensor Ruangan 01',
            timestamp: new Date().toISOString(),
            status: 'connected',
            readings: [
              { data_point_id: 101, name: 'Suhu Ruangan', value: 24.5, unit: '°C', timestamp: new Date().toISOString() },
              { data_point_id: 102, name: 'Kelembapan Udara', value: 55.0, unit: '%', timestamp: new Date().toISOString() },
            ],
          },
        ]);
      }
    };

    const connectWS = () => {
      const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      ws = new WebSocket(`${wsBase}/ws/realtime`);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type !== 'sensor_data') return;
          const fresh = hasFreshReading(msg.readings ?? []);
          const next: DeviceData = {
            device_id: msg.device_id,
            device_name: msg.device_name,
            timestamp: msg.timestamp,
            readings: fresh && msg.status === 'OK' ? msg.readings : [],
            status: fresh && msg.status === 'OK' ? 'connected' : 'offline',
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
        reconnectTimer = setTimeout(connectWS, 3000);
      };
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

  // Collect ALL readings dynamically across devices
  const allReadings: { reading: Reading; deviceName: string; isOnline: boolean }[] = [];
  devices.forEach((dev) => {
    dev.readings.forEach((r) => {
      allReadings.push({
        reading: r,
        deviceName: dev.device_name,
        isOnline: dev.status === 'connected',
      });
    });
  });

  // Extract Temperature and Humidity readings dynamically
  const tempReadings = allReadings.filter((item) => isTemp(item.reading.name));
  const humidReadings = allReadings.filter((item) => isHumid(item.reading.name));

  // Primary Temperature & Humidity values (if available)
  const primaryTemp = tempReadings[0]?.reading.value ?? 24.5;
  const primaryHumid = humidReadings[0]?.reading.value ?? 55.0;

  const tempStat = tempStatus(primaryTemp);
  const humidStat = humidStatus(primaryHumid);

  const clockTime = currentTime ?? new Date(0);
  const formattedTime = clockTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const formattedDate = clockTime.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <Sidebar />

      <main className="ml-0 min-h-screen px-4 pb-16 pt-6 md:px-8 md:py-8 lg:px-10 animate-page-entry flex flex-col justify-between">
        <div>
          {/* Status / Offline notice */}
          {loadError && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-800">
              <span className="font-medium">ℹ️ {loadError}</span>
              <span className="font-bold text-sky-600">Dynamic Sensor Engine Ready</span>
            </div>
          )}

          {/* ── TOP HEADER (Title + Compact Clock Display) ────────────────── */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  SensorHub IoT System • Temperature &amp; Humidity Focus
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Dashboard Control
              </h1>
            </div>

            {/* SIMPLIFIED COMPACT CLOCK */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-xs">
              <CompactAnalogClock time={clockTime} />
              <div className="flex flex-col">
                <span className="font-mono text-base font-black text-slate-900 tracking-tight leading-tight">
                  {formattedTime}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {/* ── SECTION 1: PRIMARY GAUGES (Temperature & Humidity) ────────── */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Primary Monitoring (Suhu &amp; Kelembapan)
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {devices.length} Perangkat Terdeteksi
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mb-8">
            {/* Speedometer 1: Primary Temperature */}
            <div className="lg:col-span-3">
              <SpeedometerGauge
                title={tempReadings[0]?.reading.name || 'Suhu Udara (Primary)'}
                value={primaryTemp.toFixed(1)}
                unit="°C"
                currentVal={primaryTemp}
                minVal={0}
                maxVal={50}
                subtitle={`Status: ${tempStat.label}`}
              />
            </div>

            {/* Speedometer 2: Primary Humidity */}
            <div className="lg:col-span-3">
              <SpeedometerGauge
                title={humidReadings[0]?.reading.name || 'Kelembapan Udara (Primary)'}
                value={primaryHumid.toFixed(0)}
                unit="%"
                currentVal={primaryHumid}
                minVal={0}
                maxVal={100}
                subtitle={`Status: ${humidStat.label}`}
              />
            </div>

            {/* Line Chart: Temperature & Humidity Trend */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Real-time Temperature vs Humidity Trend
                </h3>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-sky-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                    Suhu ({primaryTemp.toFixed(1)} °C)
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Kelembapan ({primaryHumid.toFixed(0)} %)
                  </span>
                </div>
              </div>

              {/* Dynamic Line Chart SVG */}
              <div className="relative h-44 w-full pt-2">
                <svg viewBox="0 0 500 150" className="h-full w-full overflow-visible">
                  {[30, 60, 90, 120].map((y) => (
                    <line key={y} x1="30" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  ))}

                  <text x="5" y="35" className="text-[9px] fill-slate-400 font-mono">50 °C</text>
                  <text x="5" y="75" className="text-[9px] fill-slate-400 font-mono">25 °C</text>
                  <text x="5" y="115" className="text-[9px] fill-slate-400 font-mono">0 °C</text>

                  <text x="485" y="35" className="text-[9px] fill-slate-400 font-mono">100%</text>
                  <text x="485" y="75" className="text-[9px] fill-slate-400 font-mono">50%</text>
                  <text x="485" y="115" className="text-[9px] fill-slate-400 font-mono">0%</text>

                  {/* Humidity Line (Amber) */}
                  <path
                    d="M 30 90 Q 150 110, 250 50 T 480 60"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Temperature Line (Sky Blue) */}
                  <path
                    d="M 30 110 Q 150 70, 250 75 T 480 72"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  <text x="30" y="145" className="text-[9px] fill-slate-400 font-mono">10 min ago</text>
                  <text x="140" y="145" className="text-[9px] fill-slate-400 font-mono">7 min ago</text>
                  <text x="250" y="145" className="text-[9px] fill-slate-400 font-mono">5 min ago</text>
                  <text x="360" y="145" className="text-[9px] fill-slate-400 font-mono">2 min ago</text>
                  <text x="440" y="145" className="text-[9px] fill-slate-400 font-mono">Just now</text>
                </svg>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: DYNAMIC SENSOR GRID (FLEXIBLE FOR ANY NEW SENSORS) ── */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Terdeteksi Otomatis ({allReadings.length} Point Sensor Aktif)
              </h2>
              <p className="text-[11px] text-slate-400">
                Setiap penambahan sensor baru di Master Data / Sensors akan otomatis muncul di bawah ini.
              </p>
            </div>
            <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 border border-sky-200">
              Auto-Adaptive Grid
            </span>
          </div>

          {allReadings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {allReadings.map((item, idx) => {
                const isT = isTemp(item.reading.name);
                const isH = isHumid(item.reading.name);
                const status = isT
                  ? tempStatus(item.reading.value).label
                  : isH
                  ? humidStatus(item.reading.value).label
                  : 'Normal';

                return (
                  <DynamicSensorBadge
                    key={item.reading.data_point_id || idx}
                    name={item.reading.name}
                    value={item.reading.value.toFixed(1)}
                    unit={item.reading.unit || (isT ? '°C' : isH ? '%' : '')}
                    statusLabel={status}
                    isOnline={item.isOnline}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-bold text-slate-600">Belum ada sensor tambahan terhubung.</p>
              <p className="text-xs text-slate-400 mt-1">
                Tambahkan sensor di menu <strong>Sensors Setup</strong> untuk menampilkannya secara otomatis di sini.
              </p>
            </div>
          )}

          {/* ── SECTION 3: DETAILED TREND CHARTS FOR ALL SENSORS ───────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Chart 1: Temperature Readings History */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Temperature Channels History
                </h3>
                <span className="text-xs font-semibold text-sky-600">
                  {tempReadings.length} Channels
                </span>
              </div>

              <div className="relative h-40 w-full pt-2">
                <svg viewBox="0 0 500 130" className="h-full w-full overflow-visible">
                  {[20, 55, 90].map((y) => (
                    <line key={y} x1="30" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  ))}
                  <text x="5" y="23" className="text-[9px] fill-slate-400 font-mono">35.0 °C</text>
                  <text x="5" y="58" className="text-[9px] fill-slate-400 font-mono">25.0 °C</text>
                  <text x="5" y="93" className="text-[9px] fill-slate-400 font-mono">15.0 °C</text>

                  <path d="M 30 60 Q 140 50, 250 58 T 480 55" fill="none" stroke="#38bdf8" strokeWidth="2.5" />

                  <text x="30" y="120" className="text-[9px] fill-slate-400 font-mono">10 min ago</text>
                  <text x="140" y="120" className="text-[9px] fill-slate-400 font-mono">7 min ago</text>
                  <text x="250" y="120" className="text-[9px] fill-slate-400 font-mono">5 min ago</text>
                  <text x="360" y="120" className="text-[9px] fill-slate-400 font-mono">2 min ago</text>
                  <text x="440" y="120" className="text-[9px] fill-slate-400 font-mono">Just now</text>
                </svg>
              </div>
            </div>

            {/* Chart 2: Humidity Channels History */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Humidity Channels History
                </h3>
                <span className="text-xs font-semibold text-amber-600">
                  {humidReadings.length} Channels
                </span>
              </div>

              <div className="relative h-40 w-full pt-2">
                <svg viewBox="0 0 500 130" className="h-full w-full overflow-visible">
                  {[20, 55, 90].map((y) => (
                    <line key={y} x1="30" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  ))}
                  <text x="5" y="23" className="text-[9px] fill-slate-400 font-mono">80 %</text>
                  <text x="5" y="58" className="text-[9px] fill-slate-400 font-mono">50 %</text>
                  <text x="5" y="93" className="text-[9px] fill-slate-400 font-mono">20 %</text>

                  <path d="M 30 50 Q 140 65, 250 48 T 480 52" fill="none" stroke="#f59e0b" strokeWidth="2.5" />

                  <text x="30" y="120" className="text-[9px] fill-slate-400 font-mono">10 min ago</text>
                  <text x="140" y="120" className="text-[9px] fill-slate-400 font-mono">7 min ago</text>
                  <text x="250" y="120" className="text-[9px] fill-slate-400 font-mono">5 min ago</text>
                  <text x="360" y="120" className="text-[9px] fill-slate-400 font-mono">2 min ago</text>
                  <text x="440" y="120" className="text-[9px] fill-slate-400 font-mono">Just now</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── INDUSTRIAL FOOTER STATUS BAR ──────────────────────────────── */}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500 font-medium">
          <div>
            Last update: <span className="font-mono font-bold text-slate-800">{formattedTime}</span> / Next update: <span className="font-mono font-bold text-slate-800">in 5 sec</span>
          </div>
          <div>
            System: <span className="font-bold text-emerald-600">SensorHub IoT Dynamic Engine Active</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
