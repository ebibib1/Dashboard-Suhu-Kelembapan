'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

type ConnectionType =
  | 'Modbus TCP/IP'
  | 'Modbus RTU over TCP/IP';

interface ConnectionConfig {
  id: number;
  name: string;
  type: ConnectionType;
  // Serial settings
  serialPort?: string;
  baudRate?: number;
  dataBits?: number;
  parity?: 'None' | 'Even' | 'Odd';
  stopBits?: number | string;
  modbusMode?: 'RTU' | 'ASCII';
  rtsControl?: string;
  dtrControl?: string;
  interframeDelay?: number;
  retryCount?: number;
  // Network settings
  host?: string;
  serverPort?: number;
  slaveId: number;
  localPort?: string | number;
  ipVersion?: 'IPv4' | 'IPv6';
  connectionTimeout?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  // RTU Over TCP/UDP settings
  crcHandling?: string;
  frameTimeout?: number;
  udpResponseMode?: 'Wait for response' | 'Fire and forget';
  // Common settings
  responseTimeout: number;
  delayBetweenPolls: number;
  // Status & metadata
  status: 'Connected' | 'Disconnected' | 'Testing' | 'Error' | 'Not tested';
  lastChecked: string;
  usedByCount?: number;
}

type ApiConnection = {
  id: number; name: string; protocol: 'tcp' | 'rtu' | 'rtu_over_tcp';
  host: string; port: number; slave_id: number; timeout_ms: number;
  serial_port?: string | null; baud_rate?: number | null;
  data_bits?: number | null; parity?: string | null; stop_bits?: number | null;
  is_active: boolean;
};

const CONNECTION_TYPE_DESCRIPTIONS: Record<ConnectionType, string> = {
  'Modbus TCP/IP': 'Native Modbus TCP using Ethernet and MBAP framing.',
  'Modbus RTU over TCP/IP': 'Raw Modbus RTU frames transported through a TCP socket.',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function fromApiConnection(connection: ApiConnection, usedByCount: number): ConnectionConfig {
  return {
    id: connection.id,
    name: connection.name,
    type: connection.protocol === 'rtu_over_tcp' ? 'Modbus RTU over TCP/IP' : 'Modbus TCP/IP',
    host: connection.host,
    serverPort: connection.port,
    slaveId: connection.slave_id,
    responseTimeout: connection.timeout_ms,
    delayBetweenPolls: 0,
    status: 'Not tested',
    lastChecked: 'Belum diuji',
    usedByCount,
  };
}

export default function ConnectionsConfigPage() {
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [loadError, setLoadError] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

  // Form State
  const [connName, setConnName] = useState('');
  const [connType, setConnType] = useState<ConnectionType>('Modbus TCP/IP');
  const [serialPort, setSerialPort] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [dataBits, setDataBits] = useState(8);
  const [parity, setParity] = useState<'None' | 'Even' | 'Odd'>('None');
  const [stopBits, setStopBits] = useState<number | string>(1);
  const [modbusMode, setModbusMode] = useState<'RTU' | 'ASCII'>('RTU');
  const [showAdvancedSerial, setShowAdvancedSerial] = useState(false);
  const [rtsControl, setRtsControl] = useState('None');
  const [dtrControl, setDtrControl] = useState('None');
  const [interframeDelay, setInterframeDelay] = useState(0);
  const [retryCount, setRetryCount] = useState(3);

  const [host, setHost] = useState('');
  const [serverPort, setServerPort] = useState(502);
  const [slaveId, setSlaveId] = useState(1);
  const [localPort, setLocalPort] = useState<string | number>('Auto');
  const [ipVersion, setIpVersion] = useState<'IPv4' | 'IPv6'>('IPv4');
  const [connectionTimeout, setConnectionTimeout] = useState(3000);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectInterval, setReconnectInterval] = useState(5);

  const [crcHandling, setCrcHandling] = useState('Standard Modbus CRC');
  const [frameTimeout, setFrameTimeout] = useState(100);
  const [udpResponseMode, setUdpResponseMode] = useState<'Wait for response' | 'Fire and forget'>('Wait for response');

  const [responseTimeout, setResponseTimeout] = useState(1000);
  const [delayBetweenPolls, setDelayBetweenPolls] = useState(20);

  const [testState, setTestState] = useState<{
    status: 'idle' | 'testing' | 'success' | 'failed';
    message?: string;
    latencyMs?: number;
  }>({ status: 'idle' });

  const [viewingUsedByConnection, setViewingUsedByConnection] = useState<ConnectionConfig | null>(null);

  const loadConnections = async () => {
    try {
      const [connectionResponse, deviceResponse] = await Promise.all([
        fetch(`${API_URL}/api/connections`),
        fetch(`${API_URL}/api/devices`),
      ]);
      if (!connectionResponse.ok || !deviceResponse.ok) throw new Error('Backend tidak dapat diakses');
      const apiConnections = (await connectionResponse.json()) as ApiConnection[];
      const devices = (await deviceResponse.json()) as Array<{ connection_id: number; is_active: boolean }>;
      setConnections(apiConnections.map((connection) => fromApiConnection(
        connection,
        devices.filter((device) => device.connection_id === connection.id && device.is_active).length,
      )));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat connection');
    }
  };

  useEffect(() => { void loadConnections(); }, []);

  const openNewDrawer = () => {
    setEditingConnection(null);
    setConnName('');
    setConnType('Modbus TCP/IP');
    setHost('');
    setServerPort(502);
    setSlaveId(1);
    setSerialPort('');
    setBaudRate(9600);
    setDataBits(8);
    setParity('None');
    setStopBits(1);
    setModbusMode('RTU');
    setResponseTimeout(1000);
    setDelayBetweenPolls(20);
    setTestState({ status: 'idle' });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (conn: ConnectionConfig) => {
    setEditingConnection(conn);
    setConnName(conn.name);
    setConnType(conn.type);
    setHost(conn.host || '');
    setServerPort(conn.serverPort || 502);
    setSlaveId(conn.slaveId);
    setSerialPort(conn.serialPort || '');
    setBaudRate(conn.baudRate || 9600);
    setDataBits(conn.dataBits || 8);
    setParity(conn.parity || 'None');
    setStopBits(conn.stopBits || 1);
    setModbusMode(conn.modbusMode || 'RTU');
    setResponseTimeout(conn.responseTimeout);
    setDelayBetweenPolls(conn.delayBetweenPolls);
    setTestState({ status: 'idle' });
    setIsDrawerOpen(true);
  };

  const handleTestConnection = async () => {
    if (!editingConnection) {
      setTestState({ status: 'failed', message: 'Simpan connection dulu sebelum melakukan test.' });
      return;
    }
    setTestState({ status: 'testing' });
    const startedAt = performance.now();
    try {
      const response = await fetch(`${API_URL}/api/connections/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: editingConnection.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Connection gagal');
      setTestState({
        status: 'success',
        message: result.message || 'Connection successful',
        latencyMs: Math.round(performance.now() - startedAt),
      });
      setConnections((items) => items.map((item) => item.id === editingConnection.id
        ? { ...item, status: 'Connected', lastChecked: 'Baru saja' } : item));
    } catch (error) {
      setTestState({ status: 'failed', message: error instanceof Error ? error.message : 'Connection gagal' });
      setConnections((items) => items.map((item) => item.id === editingConnection.id
        ? { ...item, status: 'Error', lastChecked: 'Baru saja' } : item));
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: connName.trim(),
      protocol: connType === 'Modbus RTU over TCP/IP' ? 'rtu_over_tcp' : 'tcp',
      host: host.trim(), port: Number(serverPort), slave_id: Number(slaveId),
      timeout_ms: Number(responseTimeout),
    };
    try {
      const response = await fetch(`${API_URL}/api/connections${editingConnection ? `/${editingConnection.id}` : ''}`, {
        method: editingConnection ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) { const result = await response.json(); throw new Error(result.detail || 'Gagal menyimpan connection'); }
      await loadConnections();
      setIsDrawerOpen(false);
    } catch (error) {
      setTestState({ status: 'failed', message: error instanceof Error ? error.message : 'Gagal menyimpan connection' });
    }
  };

  const handleDeleteConnection = async (id: number) => {
    if (confirm('Are you sure you want to delete this connection configuration?')) {
      const response = await fetch(`${API_URL}/api/connections/${id}`, { method: 'DELETE' });
      if (response.ok) await loadConnections();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <Sidebar />

      <main className="ml-0 min-h-screen px-4 pb-20 pt-6 md:px-8 md:py-8 lg:px-12 animate-page-entry">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-600">
                Layer 1: Communication
              </span>
              <span className="text-xs text-slate-400 font-medium">• Modbus Connections</span>
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Connection Configuration
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage communication settings used to connect SensorHub to Modbus devices or gateways.
            </p>
          </div>

          <button
            onClick={openNewDrawer}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-98 transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            + Add Connection
          </button>
        </div>

        {/* Concept Box */}
        <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-xs text-sky-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white font-bold">
              📡
            </span>
            <div>
              <p className="font-bold text-slate-900">Connection Layer Concept</p>
              <p className="text-slate-600">
                Defines <strong>HOW</strong> SensorHub connects to gateways or physical COM ports. Multiple sensors can share 1 connection.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex rounded-xl bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-xs border border-slate-200">
            Total {connections.length} Gateways Configured
          </span>
        </div>

        {loadError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {loadError}
          </div>
        )}

        {/* Connections Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Connection Name</th>
                  <th className="px-6 py-4">Connection Type</th>
                  <th className="px-6 py-4">Host / Port / COM</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Used By</th>
                  <th className="px-6 py-4">Last Checked</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {connections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{conn.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {conn.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {conn.host}:{conn.serverPort} · Slave {conn.slaveId}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          conn.status === 'Connected'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : conn.status === 'Not tested'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${conn.status === 'Connected' ? 'bg-emerald-500 animate-pulse' : conn.status === 'Not tested' ? 'bg-slate-400' : 'bg-rose-500'}`} />
                        {conn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setViewingUsedByConnection(conn)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        {conn.usedByCount} Sensors
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{conn.lastChecked}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditDrawer(conn)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openEditDrawer(conn)}
                        className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleDeleteConnection(conn.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drawer */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-all">
            <div className="w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto flex flex-col justify-between p-6 md:p-8 animate-page-entry">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {editingConnection ? 'Edit Connection Configuration' : 'Add Connection Configuration'}
                    </h2>
                    <p className="text-xs text-slate-500">Defines HOW SensorHub connects to a Modbus gateway.</p>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveConnection} className="mt-6 space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Connection Name</label>
                    <input
                      type="text"
                      required
                      value={connName}
                      onChange={(e) => setConnName(e.target.value)}
                      placeholder="e.g. Main Factory Gateway"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Connection Type</label>
                    <select
                      value={connType}
                      onChange={(e) => setConnType(e.target.value as ConnectionType)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="Modbus TCP/IP">Modbus TCP/IP</option>
                      <option value="Modbus RTU over TCP/IP">Modbus RTU over TCP/IP</option>
                    </select>

                    <div className="mt-2.5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-800">
                      💡 {CONNECTION_TYPE_DESCRIPTIONS[connType]}
                    </div>
                  </div>

                  {/* TCP/IP */}
                  {connType === 'Modbus TCP/IP' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Remote Modbus Server</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">IP Address / Hostname</label>
                          <input type="text" required value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.0.7" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Server Port</label>
                          <input type="number" required value={serverPort} onChange={(e) => setServerPort(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RTU OVER TCP */}
                  {connType === 'Modbus RTU over TCP/IP' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">TCP Socket Network Settings</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">IP Address / Hostname</label>
                          <input type="text" required value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.120" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Server Port</label>
                          <input type="number" required value={serverPort} onChange={(e) => setServerPort(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Modbus Slave ID</label>
                    <input type="number" min="1" max="247" required value={slaveId} onChange={(e) => setSlaveId(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium" />
                    <p className="mt-1 text-[11px] text-slate-500">Isi sesuai Slave ID yang terdeteksi/terpasang pada sensor.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Communication Timing</h4>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Response Timeout (ms)</label>
                      <input type="number" required value={responseTimeout} onChange={(e) => setResponseTimeout(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Delay Between Polls (ms)</label>
                      <input type="number" required value={delayBetweenPolls} onChange={(e) => setDelayBetweenPolls(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium" />
                    </div>
                  </div>

                  {testState.status !== 'idle' && (
                    <div className={`rounded-xl p-3.5 text-xs font-bold ${testState.status === 'testing' ? 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse' : testState.status === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                      {testState.status === 'testing' && '⚡ Testing connection...'}
                      {testState.status === 'success' && `✓ ${testState.message} (Latency: ${testState.latencyMs} ms)`}
                      {testState.status === 'failed' && `✕ ${testState.message}`}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button type="button" onClick={() => setIsDrawerOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
                      Cancel
                    </button>
                    <button type="button" onClick={handleTestConnection} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100">
                      Test Connection
                    </button>
                    <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800">
                      Save Connection
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {viewingUsedByConnection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-page-entry">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">Sensors Using Gateway</h3>
                <button onClick={() => setViewingUsedByConnection(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 flex justify-between">
                  <span>Temperature Sensor 01</span>
                  <span className="text-emerald-600 font-bold">Active (Slave 1)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 flex justify-between">
                  <span>Boiler Pressure Monitor</span>
                  <span className="text-emerald-600 font-bold">Active (Slave 2)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
