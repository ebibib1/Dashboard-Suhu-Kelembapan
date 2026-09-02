'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface SchedulerConfig {
  poll_interval_seconds: number;
  log_interval_seconds: number;
  is_running: boolean;
}

export default function SchedulerPage() {
  const [polling, setPolling] = useState(1);
  const [logging, setLogging] = useState(60);
  const [isRunning, setIsRunning] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchScheduler = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/scheduler`);
      if (res.ok) {
        const data: SchedulerConfig = await res.json();
        setPolling(data.poll_interval_seconds);
        setLogging(data.log_interval_seconds);
        setIsRunning(data.is_running);
      }
    } catch (err) {
      console.error('Failed to fetch scheduler config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchScheduler();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/scheduler`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poll_interval_seconds: Number(polling),
          log_interval_seconds: Number(logging),
          is_running: isRunning
        })
      });
      if (res.ok) {
        alert('Pengaturan scheduler berhasil diperbarui!');
        void fetchScheduler();
      }
    } catch (err) {
      console.error('Failed to update scheduler:', err);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <main className="ml-0 min-h-screen px-4 pb-20 pt-6 md:px-8 md:py-8 lg:px-10 animate-page-entry">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Scheduler & Polling</h1>
          <p className="text-slate-500 mt-1">Configure live sensor polling frequencies and database logging intervals</p>
        </div>

        {/* Scheduler Config Card */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100/50 max-w-2xl">
          {loading ? (
            <p className="text-slate-400 font-medium">Loading scheduler configuration...</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Realtime Polling Interval (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={polling}
                  onChange={(e) => setPolling(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  The speed at which the server reads data from Modbus sensors and pushes it via WebSocket (default: 1s).
                </p>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Database Historical Logging Interval (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={logging}
                  onChange={(e) => setLogging(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-500 font-medium transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  The interval at which sensor snapshots are saved permanently in the historical database (default: 60s).
                </p>
              </div>

              {/* Toggle switch for background polling job */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Background Polling Job</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Activate or temporarily pause sensor scans</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRunning(!isRunning)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    isRunning ? 'bg-sky-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isRunning ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-slate-900 text-white font-semibold px-8 py-3.5 rounded-2xl hover:bg-slate-800 active:scale-95 shadow-md transition-all"
                >
                  Save Scheduler Config
                </button>
              </div>

            </form>
          )}
        </div>
      </main>
    </div>
  );
}
