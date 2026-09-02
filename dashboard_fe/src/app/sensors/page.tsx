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
      <main className="ml-0 min-h-screen px-4 pb-20 pt-6 md:ml-20 md:px-8 md:py-8 lg:px-10">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Sensors & Devices</h1>
          <p className="text-slate-500 mt-1">Configure Modbus slave devices and register mapped data points</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Card 1: Add Device */}
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100/50 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-6">1. Add Device / Sensor</h2>
              <form onSubmit={handleCreateDevice} className="space-y-5">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Device Name</label>
                  <input
                    type="text"
                    required
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    placeholder="e.g. XY-MD02 Room 01"
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Slave ID (Modbus Address)</label>
                  <input
                    type="number"
                    required
                    value={slaveId}
                    onChange={(e) => setSlaveId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Modbus Connection</label>
                  <select
                    required
                    value={selectedConnId}
                    onChange={(e) => setSelectedConnId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors appearance-none"
                  >
                    <option value="">-- Select Connection --</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-2xl hover:bg-slate-800 active:scale-95 shadow-md transition-all mt-4"
                >
                  Save Device
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Add Register Data Point */}
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100/50">
            <h2 className="text-lg font-bold text-slate-800 mb-6">2. Add Register (Data Point)</h2>
            <form onSubmit={handleCreateDataPoint} className="space-y-5">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Device</label>
                <select
                  required
                  value={selectedDevId}
                  onChange={(e) => setSelectedDevId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors appearance-none"
                >
                  <option value="">-- Select Device --</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} (Slave #{d.slave_id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parameter Name</label>
                  <input
                    type="text"
                    required
                    value={dpName}
                    onChange={(e) => setDpName(e.target.value)}
                    placeholder="e.g. Temperature"
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Function Code</label>
                  <select
                    value={functionCode}
                    onChange={(e) => setFunctionCode(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors appearance-none"
                  >
                    <option value={3}>03 - Holding Register</option>
                    <option value={4}>04 - Input Register</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Address</label>
                  <input
                    type="number"
                    value={address}
                    onChange={(e) => setAddress(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scale</label>
                  <input
                    type="number"
                    step="0.01"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. °C, %RH"
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-2xl hover:bg-slate-800 active:scale-95 shadow-md transition-all mt-4"
              >
                Save Data Point
              </button>
            </form>
          </div>
        </div>

        {/* Devices list */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100/50">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Configured Devices & Sensors</h2>
          {loading ? (
            <p className="text-slate-400 font-medium">Loading devices...</p>
          ) : devices.length === 0 ? (
            <p className="text-slate-400 font-medium">No devices configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-4">ID</th>
                    <th className="pb-4">Device Name</th>
                    <th className="pb-4">Slave ID</th>
                    <th className="pb-4">Connection ID</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 text-sm font-medium">
                  {devices.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-slate-400">{d.id}</td>
                      <td className="py-4 font-bold text-slate-800">{d.name}</td>
                      <td className="py-4 font-mono text-slate-500">#{d.slave_id}</td>
                      <td className="py-4 text-slate-500">ID #{d.connection_id}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          d.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {d.is_active ? 'Active' : 'Inactive'}
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
