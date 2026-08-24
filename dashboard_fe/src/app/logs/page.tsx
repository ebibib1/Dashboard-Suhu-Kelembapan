'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface RawLog {
  id: number;
  timestamp: string;
  slave_id: number;
  function_code: number;
  address: number;
  registers: string;
  status: string;
  error?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/readings/raw-logs`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch raw logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <main className="ml-64 pt-8 px-8 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Modbus Raw Logs</h1>
          <p className="text-text-secondary mt-1">Audit trail dan log pembacaan register mentah Modbus (Audit & Debugging)</p>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Daftar Raw Communication Log</h2>
            <button
              onClick={fetchLogs}
              className="bg-bg-app hover:bg-bg-card-hover border border-border-subtle text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 Refresh Log
            </button>
          </div>

          {loading ? (
            <p className="text-text-secondary">Loading raw logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-text-secondary">Belum ada log transaksi Modbus tercatat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-text-secondary">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Slave ID</th>
                    <th className="pb-3">Func</th>
                    <th className="pb-3">Address</th>
                    <th className="pb-3">Raw Registers</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-primary">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 text-text-secondary">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-2.5">#{log.slave_id}</td>
                      <td className="py-2.5">0{log.function_code}</td>
                      <td className="py-2.5">{log.address}</td>
                      <td className="py-2.5 text-accent-teal">{log.registers}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.status === 'OK' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                          {log.status}
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
