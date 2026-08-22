'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface SchedulerConfig {
  polling_interval_seconds: number;
  logging_interval_seconds: number;
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
        setPolling(data.polling_interval_seconds);
        setLogging(data.logging_interval_seconds);
        setIsRunning(data.is_running);
      }
    } catch (err) {
      console.error('Failed to fetch scheduler config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduler();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/scheduler`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          polling_interval_seconds: Number(polling),
          logging_interval_seconds: Number(logging),
          is_running: isRunning
        })
      });
      if (res.ok) {
        alert('Pengaturan scheduler berhasil diperbarui!');
        fetchScheduler();
      }
    } catch (err) {
      console.error('Failed to update scheduler:', err);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <main className="ml-64 pt-8 px-8 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Scheduler & Polling</h1>
          <p className="text-text-secondary mt-1">Atur frekuensi pembacaan realtime dan interval pencatatan database</p>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 max-w-2xl">
          {loading ? (
            <p className="text-text-secondary">Loading scheduler configuration...</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Realtime Polling Interval (detik)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={polling}
                  onChange={(e) => setPolling(Number(e.target.value))}
                  className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Interval pengiriman data realtime via WebSocket ke UI Dashboard (default: 1s).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Database Historical Logging Interval (detik)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={logging}
                  onChange={(e) => setLogging(Number(e.target.value))}
                  className="w-full bg-bg-app border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-teal"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Interval penyimpanan snapshot data sensor ke dalam database historis (default: 60s).
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="status"
                  checked={isRunning}
                  onChange={(e) => setIsRunning(e.target.checked)}
                  className="w-4 h-4 accent-accent-teal rounded"
                />
                <label htmlFor="status" className="text-sm font-medium text-text-primary cursor-pointer">
                  Aktifkan Polling Background Job
                </label>
              </div>

              <button
                type="submit"
                className="bg-accent-teal text-bg-app font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Simpan Konfigurasi Scheduler
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
