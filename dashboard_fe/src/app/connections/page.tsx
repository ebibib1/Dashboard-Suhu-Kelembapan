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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/connections`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/connections`, {
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
      <main className="ml-64 pt-8 px-8 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Modbus Connections</h1>
          <p className="text-text-secondary mt-1">Kelola konfigurasi koneksi Serial RTU dan TCP</p>
        </div>

        {/* Form Tambah Koneksi */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Tambah Koneksi Baru</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Nama Connection</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Port Serial Utama"
                className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Tipe Connection</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
              >
                <option value="RTU">Modbus RTU (Serial)</option>
                <option value="TCP">Modbus TCP (Ethernet)</option>
              </select>
            </div>

            {type === 'RTU' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Port</label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="COM3 atau /dev/ttyUSB0"
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Baudrate</label>
                  <input
                    type="number"
                    value={baudrate}
                    onChange={(e) => setBaudrate(Number(e.target.value))}
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Host IP</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">TCP Port</label>
                  <input
                    type="number"
                    value={tcpPort}
                    onChange={(e) => setTcpPort(Number(e.target.value))}
                    className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                className="bg-accent-teal text-bg-app font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Simpan Koneksi
              </button>
            </div>
          </form>
        </div>

        {/* List Koneksi */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Daftar Koneksi</h2>
          {loading ? (
            <p className="text-text-secondary">Loading...</p>
          ) : connections.length === 0 ? (
            <p className="text-text-secondary">Belum ada koneksi dikonfigurasi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-text-secondary text-sm">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Nama</th>
                    <th className="pb-3">Tipe</th>
                    <th className="pb-3">Detail</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-primary">
                  {connections.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3">{c.id}</td>
                      <td className="py-3 font-medium">{c.name}</td>
                      <td className="py-3">{c.type}</td>
                      <td className="py-3 text-text-secondary">
                        {c.type === 'RTU' ? `${c.port} @ ${c.baudrate}` : `${c.host}:${c.tcp_port}`}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${c.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                          {c.is_active ? 'Aktif' : 'Nonaktif'}
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
