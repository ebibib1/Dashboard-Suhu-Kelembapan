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
      <main className="ml-0 min-h-screen px-4 pb-20 pt-6 md:ml-20 md:px-8 md:py-8 lg:px-10">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Modbus Raw Logs</h1>
          <p className="text-slate-500 mt-1">Audit trail and raw Modbus register read logs (debugging & auditing)</p>
        </div>

        {/* Logs Card */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100/50">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800">Raw Communication Log</h2>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 border border-slate-200/50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              {/* Refresh SVG Icon */}
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Refresh Logs
            </button>
          </div>

          {loading ? (
            <p className="text-slate-400 font-medium">Loading raw logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-slate-400 font-medium">No Modbus transactions logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider font-sans">
                    <th className="pb-4">Timestamp</th>
                    <th className="pb-4">Slave ID</th>
                    <th className="pb-4">Func</th>
                    <th className="pb-4">Address</th>
                    <th className="pb-4">Raw Registers</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 text-sm font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-slate-400 text-xs font-sans">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4">#{log.slave_id}</td>
                      <td className="py-4">0{log.function_code}</td>
                      <td className="py-4">{log.address}</td>
                      <td className="py-4 text-sky-500 font-bold">{log.registers}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold font-sans ${
                          log.status === 'OK' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
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
