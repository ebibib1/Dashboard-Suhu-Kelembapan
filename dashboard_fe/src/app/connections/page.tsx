'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface Connection {
  id: number;
  name: string;
  type: string;
  port?: string;
  baudrate?: number;
  host?: string;
  tcp_port?: number;
  timeout: number;
  is_active: boolean;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState('RTU');
  const [port, setPort] = useState('COM3');
  const [baudrate, setBaudrate] = useState(9600);
  const [host, setHost] = useState('127.0.0.1');
  const [tcpPort, setTcpPort] = useState(502);

  const fetchConnections = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/connections`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (err) {
      console.error('Failed to fetch connections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchConnections();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      type,
      port: type === 'RTU' ? port : undefined,
      baudrate: type === 'RTU' ? Number(baudrate) : undefined,
      host: type === 'TCP' ? host : undefined,
      tcp_port: type === 'TCP' ? Number(tcpPort) : undefined,
      timeout: 1.0,
      is_active: true,
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setName('');
        void fetchConnections();
      }
    } catch (err) {
      console.error('Failed to create connection', err);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <main className="ml-0 min-h-screen px-4 pb-20 pt-6 md:px-8 md:py-8 lg:px-10 animate-page-entry">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Modbus Connections</h1>
          <p className="text-slate-500 mt-1">Manage Serial RTU and TCP connection configurations</p>
        </div>

        {/* Form Add Connection */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100/50 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Create New Connection</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Connection Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Modbus Port"
                className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium transition-colors"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Connection Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors appearance-none"
              >
                <option value="RTU">Modbus RTU (Serial)</option>
                <option value="TCP">Modbus TCP (Ethernet)</option>
              </select>
            </div>

            {type === 'RTU' ? (
              <>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Serial Port</label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="COM3 or /dev/ttyUSB0"
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Baudrate</label>
                  <input
                    type="number"
                    value={baudrate}
                    onChange={(e) => setBaudrate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Host IP</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">TCP Port</label>
                  <input
                    type="number"
                    value={tcpPort}
                    onChange={(e) => setTcpPort(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                className="bg-slate-900 text-white font-semibold px-8 py-3.5 rounded-2xl hover:bg-slate-800 active:scale-95 shadow-md transition-all"
              >
                Save Connection
              </button>
            </div>
          </form>
        </div>

        {/* Connections List */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100/50">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Connection List</h2>
          {loading ? (
            <p className="text-slate-400 font-medium">Loading connections...</p>
          ) : connections.length === 0 ? (
            <p className="text-slate-400 font-medium">No connections configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-4">ID</th>
                    <th className="pb-4">Name</th>
                    <th className="pb-4">Type</th>
                    <th className="pb-4">Details</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 text-sm font-medium">
                  {connections.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-slate-400">{c.id}</td>
                      <td className="py-4 font-bold text-slate-800">{c.name}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          c.type === 'RTU' ? 'bg-sky-500/10 text-sky-600' : 'bg-indigo-500/10 text-indigo-600'
                        }`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="py-4 text-slate-500 font-mono">
                        {c.type === 'RTU' ? `${c.port} @ ${c.baudrate}` : `${c.host}:${c.tcp_port}`}
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          c.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {c.is_active ? 'Active' : 'Inactive'}
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
