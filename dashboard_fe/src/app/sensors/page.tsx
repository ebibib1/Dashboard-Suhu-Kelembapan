'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface Connection {
  id: number;
  name: string;
}

interface Device {
  id: number;
  name: string;
  slave_id: number;
  connection_id: number;
  is_active: boolean;
}



export default function SensorsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  const [loading, setLoading] = useState(true);

  // Form states for Device
  const [devName, setDevName] = useState('');
  const [slaveId, setSlaveId] = useState(1);
  const [selectedConnId, setSelectedConnId] = useState<number | ''>('');

  // Form states for Data Point
  const [selectedDevId, setSelectedDevId] = useState<number | ''>('');
  const [dpName, setDpName] = useState('');
  const [functionCode, setFunctionCode] = useState(4);
  const [address, setAddress] = useState(0);
  const [dataType] = useState('int16');
  const [scale, setScale] = useState(0.1);
  const [unit, setUnit] = useState('°C');

  const fetchData = async () => {
    try {
      const [connRes, devRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/connections`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/devices`)
      ]);
      if (connRes.ok) setConnections(await connRes.json());
      if (devRes.ok) setDevices(await devRes.json());
    } catch (err) {
      console.error('Failed to fetch sensors master data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: devName,
          slave_id: Number(slaveId),
          connection_id: Number(selectedConnId),
          is_active: true
        })
      });
      if (res.ok) {
        setDevName('');
        void fetchData();
      }
    } catch (err) {
      console.error('Failed to create device:', err);
    }
  };

  const handleCreateDataPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/data-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: Number(selectedDevId),
          name: dpName,
          function_code: Number(functionCode),
          address: Number(address),
          register_count: 1,
          data_type: dataType,
          scale: Number(scale),
          offset: 0,
          unit,
          enabled: true
        })
      });
      if (res.ok) {
        setDpName('');
        void fetchData();
      }
    } catch (err) {
      console.error('Failed to create data point:', err);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <main className="ml-64 pt-8 px-8 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Sensors & Devices</h1>
          <p className="text-text-secondary mt-1">Konfigurasi Perangkat Modbus dan Register Data Point</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Form Create Device */}
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">1. Tambah Device / Sensor</h2>
            <form onSubmit={handleCreateDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Nama Device</label>
                <input
                  type="text"
                  required
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  placeholder="mis. XY-MD02 Room 01"
                  className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Slave ID (Modbus Address)</label>
                <input
                  type="number"
                  required
                  value={slaveId}
                  onChange={(e) => setSlaveId(Number(e.target.value))}
                  className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Koneksi Modbus</label>
                <select
                  required
                  value={selectedConnId}
                  onChange={(e) => setSelectedConnId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                >
                  <option value="">-- Pilih Connection --</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-accent-teal text-bg-app font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Simpan Device
              </button>
            </form>
          </div>

          {/* Form Create Register Data Point */}
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">2. Tambah Register (Data Point)</h2>
            <form onSubmit={handleCreateDataPoint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Pilih Device</label>
                <select
                  required
                  value={selectedDevId}
                  onChange={(e) => setSelectedDevId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                >
                  <option value="">-- Pilih Device --</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} (Slave #{d.slave_id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Nama Parameter</label>
                  <input
                    type="text"
                    required
                    value={dpName}
                    onChange={(e) => setDpName(e.target.value)}
                    placeholder="mis. Temperature"
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Function Code</label>
                  <select
                    value={functionCode}
                    onChange={(e) => setFunctionCode(Number(e.target.value))}
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  >
                    <option value={3}>03 - Holding Register</option>
                    <option value={4}>04 - Input Register</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Address</label>
                  <input
                    type="number"
                    value={address}
                    onChange={(e) => setAddress(Number(e.target.value))}
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Scale Multiplier</label>
                  <input
                    type="number"
                    step="0.01"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="°C, %RH, V"
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-accent-teal text-bg-app font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Simpan Data Point
              </button>
            </form>
          </div>
        </div>

        {/* List Perangkat */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Daftar Device / Sensor Dikonfigurasi</h2>
          {loading ? (
            <p className="text-text-secondary">Loading...</p>
          ) : devices.length === 0 ? (
            <p className="text-text-secondary">Belum ada perangkat dikonfigurasi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-text-secondary text-sm">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Nama Device</th>
                    <th className="pb-3">Slave ID</th>
                    <th className="pb-3">Connection ID</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-primary">
                  {devices.map((d) => (
                    <tr key={d.id}>
                      <td className="py-3">{d.id}</td>
                      <td className="py-3 font-medium">{d.name}</td>
                      <td className="py-3">#{d.slave_id}</td>
                      <td className="py-3">{d.connection_id}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${d.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                          {d.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
