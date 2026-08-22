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

export default function DashboardHome() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch initial data
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/readings/current`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          setDevices([{
            device_id: 1,
            device_name: 'XY-MD02 Sensor',
            timestamp: new Date().toISOString(),
            readings: data,
            status: 'connected'
          }]);
        }
      })
      .catch(err => console.error('Failed to fetch initial data:', err));

    let websocket: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectWS = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      websocket = new WebSocket(`${wsUrl}/ws/realtime`);
      
      websocket.onopen = () => {
        setConnected(true);
        setWs(websocket);
      };
      
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'sensor_data') {
            setDevices(prev => {
              const existing = prev.find(d => d.device_id === message.device_id);
              const newDeviceData: DeviceData = {
                device_id: message.device_id,
                device_name: message.device_name,
                timestamp: message.timestamp,
                readings: message.readings,
                status: message.status,
                error: message.error
              };
              if (existing) {
                return prev.map(d => d.device_id === message.device_id ? newDeviceData : d);
              }
              return [...prev, newDeviceData];
            });
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('WS message parse error:', e);
        }
      };
      
      websocket.onclose = () => {
        setConnected(false);
        // Auto reconnect after 3 seconds
        reconnectTimer = setTimeout(connectWS, 3000);
      };
      
      websocket.onerror = () => {
        setConnected(false);
      };
    };

    connectWS();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (websocket) websocket.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg-app">
      <main className="ml-64 pt-8 px-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Real-time sensor monitoring</p>
        </div>

        {/* Connection Status */}
        <div className="mb-6 flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${connected ? 'bg-accent-green/15 border border-accent-green/30' : 'bg-accent-red/15 border border-accent-red/30'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-accent-green' : 'bg-accent-red'}`}></span>
            <span className={`text-sm font-medium ${connected ? 'text-accent-green' : 'text-accent-red'}`}>
              {connected ? 'Realtime Connected' : 'Realtime Disconnected'}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-sm text-text-secondary">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Metric Grid */}
        {devices.length > 0 ? (
          <>
            {devices.map(device => (
              <div key={device.device_id} className="mb-8">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  {device.device_name} {device.error && ` - ${device.error}`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {device.readings.map(reading => (
                    <MetricCard
                      key={reading.data_point_id}
                      label={reading.name}
                      value={reading.value.toFixed(1)}
                      unit={reading.unit}
                      status={device.status === 'OK' || device.status === 'connected' ? 'connected' : 'disconnected'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">📟</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">No Sensor Data</h3>
            <p className="text-text-secondary mb-6">
              Configure connections and sensors to start monitoring
            </p>
            <a href="/connections" className="inline-flex items-center gap-2 px-4 py-2 bg-accent-teal text-bg-app rounded-lg font-medium hover:opacity-90 transition-opacity">
              Setup Connections
            </a>
          </div>
        )}
      </main>
    </div>
  );
}