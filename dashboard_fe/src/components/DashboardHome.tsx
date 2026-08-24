'use client';

import { useEffect, useState } from 'react';
import MetricCard from './MetricCard';

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

type HistoryMap = Record<number, number[]>;

function TrendChart({ values, color = 'var(--accent-teal)' }: { values: number[]; color?: string }) {
  if (values.length < 2) {
    return <div className="flex h-full items-center justify-center text-sm text-text-secondary">Menunggu histori pembacaan...</div>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 92 - ((value - min) / range) * 72;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Grafik tren sensor">
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${points} L 100,100 L 0,100 Z`} fill="url(#chart-fill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function DashboardHome() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [history, setHistory] = useState<HistoryMap>({});
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let websocket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const loadInitialData = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      try {
        const currentResponse = await fetch(`${apiUrl}/api/readings/current`);
        const readings: Reading[] = currentResponse.ok ? await currentResponse.json() : [];
        if (readings.length === 0) return;

        const device: DeviceData = {
          device_id: 1,
          device_name: 'XY-MD02 Sensor',
          timestamp: readings[0].timestamp,
          readings,
          status: 'connected',
        };
        setDevices([device]);
        setLastUpdate(new Date(readings[0].timestamp));

        const historyResponse = await fetch(`${apiUrl}/api/readings/device/1/history?limit=60`);
        if (historyResponse.ok) {
          const rows: Array<{ data_point_id: number; value: number }> = await historyResponse.json();
          const grouped = rows.reverse().reduce<HistoryMap>((result, row) => {
            result[row.data_point_id] = [...(result[row.data_point_id] || []), row.value];
            return result;
          }, {});
          setHistory(grouped);
        }
      } catch (error) {
        console.error('Failed to fetch initial sensor data:', error);
      }
    };

    const connectWS = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      websocket = new WebSocket(`${wsUrl}/ws/realtime`);
      websocket.onopen = () => setConnected(true);
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type !== 'sensor_data') return;
          const nextDevice: DeviceData = {
            device_id: message.device_id,
            device_name: message.device_name,
            timestamp: message.timestamp,
            readings: message.readings,
            status: message.status,
            error: message.error,
          };
          setDevices((previous) => previous.some((item) => item.device_id === nextDevice.device_id)
            ? previous.map((item) => item.device_id === nextDevice.device_id ? nextDevice : item)
            : [...previous, nextDevice]);
          setHistory((previous) => {
            const next = { ...previous };
            nextDevice.readings.forEach((reading) => {
              next[reading.data_point_id] = [...(next[reading.data_point_id] || []), reading.value].slice(-60);
            });
            return next;
          });
          setLastUpdate(new Date(message.timestamp));
        } catch (error) {
          console.error('WS message parse error:', error);
        }
      };
      websocket.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connectWS, 3000);
      };
      websocket.onerror = () => setConnected(false);
    };

    const timer = setTimeout(() => {
      void loadInitialData();
      connectWS();
    }, 0);
    return () => {
      clearTimeout(timer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      websocket?.close();
    };
  }, []);

  const primaryDevice = devices[0];
  const temperature = primaryDevice?.readings.find((reading) => /temperature|suhu/i.test(reading.name));
  const humidity = primaryDevice?.readings.find((reading) => /humidity|kelembaban/i.test(reading.name));
  const temperatureHistory = temperature ? history[temperature.data_point_id] || [temperature.value] : [];
  const humidityPercent = humidity ? Math.max(0, Math.min(100, humidity.value)) : 0;

  return (
    <div className="min-h-screen bg-bg-app">
      <main className="ml-0 min-h-screen px-4 pb-16 pt-24 sm:px-6 md:ml-64 md:px-8 md:pt-8">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-teal">SensorHub / Overview</p>
            <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
            <p className="mt-1 text-text-secondary">Real-time sensor monitoring</p>
          </div>
          <div className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${connected ? 'border-accent-green/30 bg-accent-green/15 text-accent-green' : 'border-accent-red/30 bg-accent-red/15 text-accent-red'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-accent-green' : 'bg-accent-red'}`} />
            {connected ? 'Realtime Connected' : 'Realtime Disconnected'}
          </div>
        </header>

        {primaryDevice ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <section className="rounded-2xl border border-border-subtle bg-bg-card p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Temperature trend</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-text-primary">{temperature?.value.toFixed(1) ?? '--'}</span>
                      <span className="text-lg text-text-secondary">{temperature?.unit || '°C'}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-accent-teal/15 px-2.5 py-1 text-xs font-medium text-accent-teal">Live</span>
                </div>
                <div className="h-48 sm:h-64"><TrendChart values={temperatureHistory} /></div>
                <div className="mt-4 flex justify-between text-xs text-text-secondary">
                  <span>60 pembacaan terakhir</span>
                  <span>{lastUpdate ? `Update ${lastUpdate.toLocaleTimeString()}` : 'Belum ada update'}</span>
                </div>
              </section>

              <section className="rounded-2xl border border-border-subtle bg-bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Humidity</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-text-primary">{humidity?.value.toFixed(1) ?? '--'}</span>
                      <span className="text-lg text-text-secondary">{humidity?.unit || '%RH'}</span>
                    </div>
                  </div>
                  <span className="text-2xl text-accent-pink">◌</span>
                </div>
                <div className="mx-auto my-8 flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--accent-pink) ${humidityPercent}%, var(--border-subtle) 0)` }}>
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-bg-card text-center"><span className="text-2xl font-bold text-text-primary">{humidityPercent.toFixed(0)}<small className="text-sm text-text-secondary">%</small></span></div>
                </div>
                <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-xs text-text-secondary"><span>{primaryDevice.device_name}</span><span className="text-accent-green">● {primaryDevice.status}</span></div>
              </section>
            </div>

            <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {primaryDevice.readings.map((reading, index) => (
                <MetricCard key={reading.data_point_id} label={reading.name} value={reading.value.toFixed(1)} unit={reading.unit} status={primaryDevice.status === 'connected' || primaryDevice.status === 'OK' ? 'connected' : 'disconnected'} sparkline={history[reading.data_point_id] || [reading.value]} accent={index % 2 === 0 ? 'teal' : 'pink'} />
              ))}
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-border-subtle bg-bg-card p-12 text-center"><div className="mb-4 text-4xl">📡</div><h3 className="mb-2 text-xl font-semibold text-text-primary">No Sensor Data</h3><p className="mb-6 text-text-secondary">Configure connections and sensors to start monitoring</p><a href="/connections" className="inline-flex rounded-lg bg-accent-teal px-4 py-2 font-medium text-bg-app transition-opacity hover:opacity-90">Setup Connections</a></div>
        )}
      </main>
    </div>
  );
}