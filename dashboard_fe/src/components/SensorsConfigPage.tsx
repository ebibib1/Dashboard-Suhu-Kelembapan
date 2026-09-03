'use client';

import { FormEvent, useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
type Connection = { id: number; name: string; host: string; port: number; is_active: boolean };
type Device = { id: number; name: string; connection_id: number; slave_id: number; is_active: boolean };
type Point = { id: number; device_id: number; function_code: number; address: number; register_count: number };

export default function SensorsConfigPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [points, setPoints] = useState<Record<number, Point[]>>({});
  const [editing, setEditing] = useState<Device | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [connectionId, setConnectionId] = useState(0);
  const [slaveId, setSlaveId] = useState(1);
  const [functionCode, setFunctionCode] = useState(4);
  const [address, setAddress] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = async () => {
    try {
      const [cRes, dRes] = await Promise.all([fetch(`${API}/api/connections`), fetch(`${API}/api/devices`)]);
      if (!cRes.ok || !dRes.ok) throw new Error('Backend tidak dapat diakses');
      const c = await cRes.json() as Connection[];
      const d = await dRes.json() as Device[];
      const p: Record<number, Point[]> = {};
      await Promise.all(d.map(async (device) => {
        const response = await fetch(`${API}/api/data-points?device_id=${device.id}`);
        p[device.id] = response.ok ? await response.json() as Point[] : [];
      }));
      setConnections(c); setDevices(d); setPoints(p); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat sensor'); }
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(null); setName(''); setConnectionId(connections[0]?.id ?? 0); setSlaveId(1); setFunctionCode(4); setAddress(0); setQuantity(1); setTestResult(null); setOpen(true); };
  const openEdit = (device: Device) => { const p = points[device.id]?.[0]; setEditing(device); setName(device.name); setConnectionId(device.connection_id); setSlaveId(device.slave_id); setFunctionCode(p?.function_code ?? 4); setAddress(p?.address ?? 0); setQuantity(p?.register_count ?? 1); setTestResult(null); setOpen(true); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API}/api/devices${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), connection_id: connectionId, slave_id: slaveId, description: null }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.detail || 'Gagal menyimpan sensor'); }
      const device = await response.json() as Device;
      const old = points[device.id]?.[0];
      const pointResponse = await fetch(`${API}/api/data-points${old ? `/${old.id}` : ''}`, { method: old ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(old ? {} : { device_id: device.id }), name: 'Sensor Value', function_code: functionCode, address, register_count: quantity, data_type: 'int16', byte_order: 'big', word_order: 'big', scale: 1, offset: 0, unit: null, enabled: true }) });
      if (!pointResponse.ok) { const body = await pointResponse.json(); throw new Error(body.detail || 'Gagal menyimpan register sensor'); }
      await load(); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan sensor'); }
  };

  const remove = async (id: number) => { if (!confirm('Hapus sensor ini dari database?')) return; const response = await fetch(`${API}/api/devices/${id}`, { method: 'DELETE' }); if (!response.ok) setError('Gagal menghapus sensor'); else await load(); };
  const test = async (device: Device) => { try { const response = await fetch(`${API}/api/readings/device/${device.id}/current`); if (!response.ok) throw new Error('Gagal membaca data sensor'); const readings = await response.json() as Array<{ name: string; value: number; unit?: string }>; setTestResult(readings.length ? readings.map((r) => `${r.name}: ${r.value} ${r.unit ?? ''}`).join(' · ') : 'Belum ada pembacaan dari sensor'); } catch (e) { setTestResult(e instanceof Error ? e.message : 'Gagal membaca sensor'); } };

  return <div className="min-h-screen bg-slate-50 text-slate-900"><Sidebar /><main className="px-4 pb-20 pt-6 md:px-8 md:py-8 lg:px-12"><div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Sensor Setup</p><h1 className="mt-1 text-3xl font-bold">Sensor &amp; Register Setup</h1><p className="mt-1 text-sm text-slate-500">Data sensor dan register berasal dari database aktual.</p></div><button onClick={openNew} disabled={!connections.length} className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white disabled:opacity-40">+ Add Sensor</button></div>{error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}{testResult && <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">Test Read: {testResult}</div>}<div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Sensor</th><th className="px-5 py-4">Connection</th><th className="px-5 py-4">Slave ID</th><th className="px-5 py-4">Register</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{devices.map((device) => { const c = connections.find((item) => item.id === device.connection_id); const p = points[device.id]?.[0]; return <tr key={device.id}><td className="px-5 py-4 font-bold">{device.name}</td><td className="px-5 py-4 font-mono text-xs">{c ? `${c.name} (${c.host}:${c.port})` : '-'}</td><td className="px-5 py-4">{device.slave_id}</td><td className="px-5 py-4 font-mono text-xs">FC {p?.function_code ?? '-'} / addr {p?.address ?? '-'} / qty {p?.register_count ?? '-'}</td><td className="px-5 py-4 text-emerald-600">{device.is_active ? 'Active' : 'Inactive'}</td><td className="space-x-2 px-5 py-4 text-right"><button onClick={() => void test(device)} className="rounded-lg border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700">Test Read</button><button onClick={() => openEdit(device)} className="rounded-lg border px-3 py-1 text-xs font-semibold">Edit</button><button onClick={() => void remove(device.id)} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">Delete</button></td></tr>; })}</tbody></table>{!devices.length && <p className="px-5 py-12 text-center text-sm text-slate-400">Belum ada sensor di database.</p>}</div>{open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form onSubmit={save} className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing ? 'Edit Sensor' : 'Tambah Sensor'}</h2><button type="button" onClick={() => setOpen(false)}>✕</button></div><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama sensor aktual" className="w-full rounded-xl border px-3 py-2 text-sm" /><select required value={connectionId} onChange={(e) => setConnectionId(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2 text-sm">{connections.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.host}:{c.port}</option>)}</select><div className="grid grid-cols-3 gap-3"><input required min="1" max="247" type="number" value={slaveId} onChange={(e) => setSlaveId(Number(e.target.value))} placeholder="Slave ID" className="rounded-xl border px-3 py-2 text-sm" /><input required min="1" max="4" type="number" value={functionCode} onChange={(e) => setFunctionCode(Number(e.target.value))} placeholder="Function" className="rounded-xl border px-3 py-2 text-sm" /><input required min="0" type="number" value={address} onChange={(e) => setAddress(Number(e.target.value))} placeholder="Address" className="rounded-xl border px-3 py-2 text-sm" /></div><input required min="1" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} placeholder="Register quantity" className="w-full rounded-xl border px-3 py-2 text-sm" /><div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-xs font-bold">Cancel</button><button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Save Sensor</button></div></form></div>}</main></div>;
}
