'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

// ─── Interfaces ─────────────────────────────────────────────────────────────

type ConnectionType =
  | 'Serial Port'
  | 'Modbus TCP/IP'
  | 'Modbus RTU over TCP/IP'
  | 'Modbus RTU over UDP/IP';

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
  status: 'Connected' | 'Disconnected' | 'Testing' | 'Error';
  lastChecked: string;
  usedByCount?: number;
}

interface RegisterMapping {
  id: string;
  registerOffset: number;
  alias: string;
  dataType: 'Int16' | 'UInt16' | 'Int32' | 'UInt32' | 'Float32' | 'Boolean' | 'Hex' | 'Raw';
  scale: number;
  unit: string;
}

interface SensorDefinition {
  id: number;
  name: string;
  connectionId: number;
  slaveId: number;
  functionCode: string; // '01', '02', '03', '04'
  startAddress: number;
  quantity: number;
  scanRate: number; // ms
  useConnectionDefaultTimeout: boolean;
  customTimeout?: number;
  byteOrder: 'Big Endian' | 'Little Endian';
  wordOrder: 'High Word First' | 'Low Word First';
  status: 'Active' | 'Inactive' | 'Error';
  mappings: RegisterMapping[];
}

interface TestReadResult {
  connectionInfo: string;
  slaveId: number;
  functionCode: string;
  registerRange: string;
  rawResponse: { register: number; value: number }[];
  parsedData: { alias: string; value: string; unit: string }[];
  responseTimeMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

// ─── Initial Mock / Seed Data ───────────────────────────────────────────────

const DEFAULT_CONNECTIONS: ConnectionConfig[] = [
  {
    id: 1,
    name: 'Main Factory Gateway',
    type: 'Modbus TCP/IP',
    host: '192.168.0.7',
    serverPort: 502,
    ipVersion: 'IPv4',
    connectionTimeout: 3000,
    responseTimeout: 1000,
    delayBetweenPolls: 20,
    autoReconnect: true,
    reconnectInterval: 5,
    status: 'Connected',
    lastChecked: '2 sec ago',
    usedByCount: 4,
  },
  {
    id: 2,
    name: 'Serial RS-485 Bus 01',
    type: 'Serial Port',
    serialPort: 'COM3',
    baudRate: 9600,
    dataBits: 8,
    parity: 'None',
    stopBits: 1,
    modbusMode: 'RTU',
    responseTimeout: 1000,
    delayBetweenPolls: 20,
    rtsControl: 'None',
    dtrControl: 'None',
    interframeDelay: 0,
    retryCount: 3,
    status: 'Connected',
    lastChecked: '5 sec ago',
    usedByCount: 2,
  },
  {
    id: 3,
    name: 'Ethernet RTU Bridge #1',
    type: 'Modbus RTU over TCP/IP',
    host: '192.168.1.120',
    serverPort: 502,
    ipVersion: 'IPv4',
    connectionTimeout: 3000,
    responseTimeout: 1000,
    delayBetweenPolls: 20,
    crcHandling: 'Standard Modbus CRC',
    frameTimeout: 100,
    autoReconnect: true,
    status: 'Disconnected',
    lastChecked: '1 min ago',
    usedByCount: 1,
  },
  {
    id: 4,
    name: 'Wireless UDP Sensor Node',
    type: 'Modbus RTU over UDP/IP',
    host: '10.0.4.15',
    serverPort: 502,
    localPort: 'Auto',
    ipVersion: 'IPv4',
    responseTimeout: 1000,
    delayBetweenPolls: 20,
    crcHandling: 'Standard Modbus CRC',
    udpResponseMode: 'Wait for response',
    status: 'Connected',
    lastChecked: '10 sec ago',
    usedByCount: 1,
  },
];

const DEFAULT_SENSORS: SensorDefinition[] = [
  {
    id: 1,
    name: 'Temperature Sensor 01',
    connectionId: 1,
    slaveId: 1,
    functionCode: '03',
    startAddress: 0,
    quantity: 2,
    scanRate: 1000,
    useConnectionDefaultTimeout: true,
    byteOrder: 'Big Endian',
    wordOrder: 'High Word First',
    status: 'Active',
    mappings: [
      { id: 'm1', registerOffset: 0, alias: 'Temperature', dataType: 'Int16', scale: 0.1, unit: '°C' },
      { id: 'm2', registerOffset: 1, alias: 'Humidity', dataType: 'UInt16', scale: 0.1, unit: '%' },
    ],
  },
  {
    id: 2,
    name: 'Boiler Pressure Monitor',
    connectionId: 1,
    slaveId: 2,
    functionCode: '04',
    startAddress: 10,
    quantity: 2,
    scanRate: 2000,
    useConnectionDefaultTimeout: true,
    byteOrder: 'Big Endian',
    wordOrder: 'High Word First',
    status: 'Active',
    mappings: [
      { id: 'm3', registerOffset: 0, alias: 'Steam Pressure', dataType: 'Float32', scale: 1.0, unit: 'Bar' },
    ],
  },
  {
    id: 3,
    name: 'RS485 Temp & RH Sensor',
    connectionId: 2,
    slaveId: 1,
    functionCode: '03',
    startAddress: 0,
    quantity: 2,
    scanRate: 1000,
    useConnectionDefaultTimeout: true,
    byteOrder: 'Big Endian',
    wordOrder: 'High Word First',
    status: 'Active',
    mappings: [
      { id: 'm4', registerOffset: 0, alias: 'Ambient Temp', dataType: 'Int16', scale: 0.1, unit: '°C' },
      { id: 'm5', registerOffset: 1, alias: 'Relative Humidity', dataType: 'UInt16', scale: 0.1, unit: '%RH' },
    ],
  },
];

// Helper type descriptions
const CONNECTION_TYPE_DESCRIPTIONS: Record<ConnectionType, string> = {
  'Serial Port': 'Direct Modbus RTU/ASCII communication through a local COM port.',
  'Modbus TCP/IP': 'Native Modbus TCP using Ethernet and MBAP framing.',
  'Modbus RTU over TCP/IP': 'Raw Modbus RTU frames transported through a TCP socket.',
  'Modbus RTU over UDP/IP': 'Raw Modbus RTU frames transported using UDP datagrams.',
};

export default function MasterDataPage({ initialTab = 'connections' }: { initialTab?: 'connections' | 'sensors' }) {
  const [activeTab, setActiveTab] = useState<'connections' | 'sensors'>(initialTab);

  // Connection State
  const [connections, setConnections] = useState<ConnectionConfig[]>(DEFAULT_CONNECTIONS);
  const [isConnectionDrawerOpen, setIsConnectionDrawerOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

  // Connection Form State
  const [connName, setConnName] = useState('');
  const [connType, setConnType] = useState<ConnectionType>('Modbus TCP/IP');
  // Serial Form State
  const [serialPort, setSerialPort] = useState('COM1');
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

  // Network Form State
  const [host, setHost] = useState('192.168.0.7');
  const [serverPort, setServerPort] = useState(502);
  const [localPort, setLocalPort] = useState<string | number>('Auto');
  const [ipVersion, setIpVersion] = useState<'IPv4' | 'IPv6'>('IPv4');
  const [connectionTimeout, setConnectionTimeout] = useState(3000);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectInterval, setReconnectInterval] = useState(5);

  // RTU Over TCP/UDP Form State
  const [crcHandling, setCrcHandling] = useState('Standard Modbus CRC');
  const [frameTimeout, setFrameTimeout] = useState(100);
  const [udpResponseMode, setUdpResponseMode] = useState<'Wait for response' | 'Fire and forget'>('Wait for response');

  // Common Form State
  const [responseTimeout, setResponseTimeout] = useState(1000);
  const [delayBetweenPolls, setDelayBetweenPolls] = useState(20);

  // Testing State
  const [testState, setTestState] = useState<{
    status: 'idle' | 'testing' | 'success' | 'failed';
    message?: string;
    latencyMs?: number;
  }>({ status: 'idle' });

  // Sensor State
  const [sensors, setSensors] = useState<SensorDefinition[]>(DEFAULT_SENSORS);
  const [isSensorDrawerOpen, setIsSensorDrawerOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<SensorDefinition | null>(null);

  // Sensor Form State
  const [sensorName, setSensorName] = useState('');
  const [sensorConnectionId, setSensorConnectionId] = useState<number>(1);
  const [slaveId, setSlaveId] = useState(1);
  const [functionCode, setFunctionCode] = useState('03');
  const [startAddress, setStartAddress] = useState(0);
  const [quantity, setQuantity] = useState(2);
  const [scanRate, setScanRate] = useState(1000);
  const [useConnDefaultTimeout, setUseConnDefaultTimeout] = useState(true);
  const [customTimeout, setCustomTimeout] = useState(1000);
  const [byteOrder, setByteOrder] = useState<'Big Endian' | 'Little Endian'>('Big Endian');
  const [wordOrder, setWordOrder] = useState<'High Word First' | 'Low Word First'>('High Word First');
  const [registerMappings, setRegisterMappings] = useState<RegisterMapping[]>([]);

  // Live Test Sensor Modal
  const [liveTestResult, setLiveTestResult] = useState<TestReadResult | null>(null);
  const [isTestingSensorRead, setIsTestingSensorRead] = useState(false);

  // Used By Modal
  const [viewingUsedByConnection, setViewingUsedByConnection] = useState<ConnectionConfig | null>(null);

  // Sync tab from props
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // ── Open Connection Drawer ──────────────────────────────────────────────────
  const openNewConnectionDrawer = () => {
    setEditingConnection(null);
    setConnName('');
    setConnType('Modbus TCP/IP');
    setHost('192.168.0.7');
    setServerPort(502);
    setSerialPort('COM1');
    setBaudRate(9600);
    setDataBits(8);
    setParity('None');
    setStopBits(1);
    setModbusMode('RTU');
    setResponseTimeout(1000);
    setDelayBetweenPolls(20);
    setTestState({ status: 'idle' });
    setIsConnectionDrawerOpen(true);
  };

  const openEditConnectionDrawer = (conn: ConnectionConfig) => {
    setEditingConnection(conn);
    setConnName(conn.name);
    setConnType(conn.type);
    setHost(conn.host || '192.168.0.7');
    setServerPort(conn.serverPort || 502);
    setSerialPort(conn.serialPort || 'COM1');
    setBaudRate(conn.baudRate || 9600);
    setDataBits(conn.dataBits || 8);
    setParity(conn.parity || 'None');
    setStopBits(conn.stopBits || 1);
    setModbusMode(conn.modbusMode || 'RTU');
    setResponseTimeout(conn.responseTimeout);
    setDelayBetweenPolls(conn.delayBetweenPolls);
    setTestState({ status: 'idle' });
    setIsConnectionDrawerOpen(true);
  };

  // ── Handle Connection Test ─────────────────────────────────────────────────
  const handleTestConnection = () => {
    setTestState({ status: 'testing' });
    setTimeout(() => {
      // Simulate connection test result
      const isSuccess = Math.random() > 0.15;
      if (isSuccess) {
        setTestState({
          status: 'success',
          message: 'Connection successful',
          latencyMs: Math.floor(Math.random() * 15) + 8,
        });
      } else {
        setTestState({
          status: 'failed',
          message: `Connection failed: Timed out after ${connectionTimeout || 3000} ms`,
        });
      }
    }, 1200);
  };

  // ── Handle Connection Save ────────────────────────────────────────────────
  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const newConn: ConnectionConfig = {
      id: editingConnection ? editingConnection.id : Date.now(),
      name: connName || 'New Connection Gateway',
      type: connType,
      serialPort: connType === 'Serial Port' ? serialPort : undefined,
      baudRate: connType === 'Serial Port' ? Number(baudRate) : undefined,
      dataBits: connType === 'Serial Port' ? Number(dataBits) : undefined,
      parity: connType === 'Serial Port' ? parity : undefined,
      stopBits: connType === 'Serial Port' ? stopBits : undefined,
      modbusMode: connType === 'Serial Port' ? modbusMode : undefined,
      rtsControl,
      dtrControl,
      interframeDelay,
      retryCount,
      host: connType !== 'Serial Port' ? host : undefined,
      serverPort: connType !== 'Serial Port' ? Number(serverPort) : undefined,
      localPort: connType === 'Modbus RTU over UDP/IP' ? localPort : undefined,
      ipVersion,
      connectionTimeout,
      autoReconnect,
      reconnectInterval,
      crcHandling,
      frameTimeout,
      udpResponseMode,
      responseTimeout: Number(responseTimeout),
      delayBetweenPolls: Number(delayBetweenPolls),
      status: 'Connected',
      lastChecked: 'Just now',
      usedByCount: editingConnection ? editingConnection.usedByCount : 0,
    };

    if (editingConnection) {
      setConnections(connections.map((c) => (c.id === editingConnection.id ? newConn : c)));
    } else {
      setConnections([...connections, newConn]);
    }
    setIsConnectionDrawerOpen(false);
  };

  // ── Handle Connection Delete ──────────────────────────────────────────────
  const handleDeleteConnection = (id: number) => {
    if (confirm('Are you sure you want to delete this connection configuration?')) {
      setConnections(connections.filter((c) => c.id !== id));
    }
  };

  // ── Open Sensor Drawer ────────────────────────────────────────────────────
  const openNewSensorDrawer = () => {
    setEditingSensor(null);
    setSensorName('');
    setSensorConnectionId(connections[0]?.id || 1);
    setSlaveId(1);
    setFunctionCode('03');
    setStartAddress(0);
    setQuantity(2);
    setScanRate(1000);
    setUseConnDefaultTimeout(true);
    setByteOrder('Big Endian');
    setWordOrder('High Word First');
    setRegisterMappings([
      { id: '1', registerOffset: 0, alias: 'Temperature', dataType: 'Int16', scale: 0.1, unit: '°C' },
      { id: '2', registerOffset: 1, alias: 'Humidity', dataType: 'UInt16', scale: 0.1, unit: '%' },
    ]);
    setIsSensorDrawerOpen(true);
  };

  const openEditSensorDrawer = (sensor: SensorDefinition) => {
    setEditingSensor(sensor);
    setSensorName(sensor.name);
    setSensorConnectionId(sensor.connectionId);
    setSlaveId(sensor.slaveId);
    setFunctionCode(sensor.functionCode);
    setStartAddress(sensor.startAddress);
    setQuantity(sensor.quantity);
    setScanRate(sensor.scanRate);
    setUseConnDefaultTimeout(sensor.useConnectionDefaultTimeout);
    setCustomTimeout(sensor.customTimeout || 1000);
    setByteOrder(sensor.byteOrder);
    setWordOrder(sensor.wordOrder);
    setRegisterMappings(sensor.mappings || []);
    setIsSensorDrawerOpen(true);
  };

  // ── Register Mapping Handlers ──────────────────────────────────────────────
  const addRegisterMappingRow = () => {
    const nextOffset = registerMappings.length > 0 ? Math.max(...registerMappings.map((m) => m.registerOffset)) + 1 : 0;
    const newMapping: RegisterMapping = {
      id: Date.now().toString(),
      registerOffset: nextOffset,
      alias: `DataPoint_${nextOffset + 1}`,
      dataType: 'UInt16',
      scale: 1.0,
      unit: '',
    };
    setRegisterMappings([...registerMappings, newMapping]);
  };

  const removeRegisterMappingRow = (id: string) => {
    setRegisterMappings(registerMappings.filter((m) => m.id !== id));
  };

  const updateRegisterMappingRow = (id: string, field: keyof RegisterMapping, value: any) => {
    setRegisterMappings(
      registerMappings.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // ── Handle Sensor Save ─────────────────────────────────────────────────────
  const handleSaveSensor = (e: React.FormEvent) => {
    e.preventDefault();
    const newSensor: SensorDefinition = {
      id: editingSensor ? editingSensor.id : Date.now(),
      name: sensorName || 'Temperature Sensor',
      connectionId: sensorConnectionId,
      slaveId: Number(slaveId),
      functionCode,
      startAddress: Number(startAddress),
      quantity: Number(quantity),
      scanRate: Number(scanRate),
      useConnectionDefaultTimeout: useConnDefaultTimeout,
      customTimeout: useConnDefaultTimeout ? undefined : Number(customTimeout),
      byteOrder,
      wordOrder,
      status: 'Active',
      mappings: registerMappings,
    };

    if (editingSensor) {
      setSensors(sensors.map((s) => (s.id === editingSensor.id ? newSensor : s)));
    } else {
      setSensors([...sensors, newSensor]);
      // Increment connection used count
      setConnections(
        connections.map((c) =>
          c.id === sensorConnectionId ? { ...c, usedByCount: (c.usedByCount || 0) + 1 } : c
        )
      );
    }
    setIsSensorDrawerOpen(false);
  };

  // ── Handle Live Sensor Test Read ───────────────────────────────────────────
  const handleTestReadSensor = (sensor?: SensorDefinition) => {
    const targetSensor = sensor || {
      name: sensorName || 'Test Sensor',
      connectionId: sensorConnectionId,
      slaveId,
      functionCode,
      startAddress,
      quantity,
      mappings: registerMappings,
    };

    const targetConn = connections.find((c) => c.id === targetSensor.connectionId);
    const connStr = targetConn
      ? targetConn.type === 'Serial Port'
        ? `${targetConn.serialPort} (${targetConn.baudRate} bps)`
        : `${targetConn.host}:${targetConn.serverPort}`
      : '192.168.0.7:502';

    setIsTestingSensorRead(true);
    setLiveTestResult(null);

    setTimeout(() => {
      setIsTestingSensorRead(false);
      setLiveTestResult({
        connectionInfo: connStr,
        slaveId: targetSensor.slaveId,
        functionCode: targetSensor.functionCode,
        registerRange: `${targetSensor.startAddress} – ${targetSensor.startAddress + targetSensor.quantity - 1}`,
        rawResponse: [
          { register: targetSensor.startAddress, value: 263 },
          { register: targetSensor.startAddress + 1, value: 684 },
        ],
        parsedData: [
          { alias: 'Temperature', value: '26.3', unit: '°C' },
          { alias: 'Humidity', value: '68.4', unit: '%' },
        ],
        responseTimeMs: 18,
        status: 'success',
      });
    }, 1000);
  };

  // Selected Connection Summary Helper
  const selectedConnectionSummary = connections.find((c) => c.id === sensorConnectionId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <Sidebar />

      <main className="ml-0 min-h-screen px-4 pb-20 pt-6 md:px-8 md:py-8 lg:px-12 animate-page-entry">
        {/* ── Page Header ────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-600">
                System Setup
              </span>
              <span className="text-xs text-slate-400 font-medium">• Master Data</span>
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Master Data Configuration
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage Modbus connection gateways and sensor register read definitions independently.
            </p>
          </div>
        </div>

        {/* ── Architecture Concept Callout ─────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-slate-50 p-5 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Two-Layer Configuration Architecture</h3>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  <strong>1. Connections</strong> define <em>HOW</em> SensorHub connects to gateways or COM ports.
                  <br />
                  <strong>2. Sensors</strong> define <em>WHAT</em> Modbus slave registers to poll through those connections.
                </p>
              </div>
            </div>

            {/* Relationship Visualizer Badge */}
            <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold shadow-xs border border-slate-200/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-700">1 Gateway Connection ➔ Multiple Slave Sensors</span>
            </div>
          </div>
        </div>

        {/* ── Segmented Navigation Tabs ──────────────────────────────────────── */}
        <div className="mb-6 flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition-all ${
              activeTab === 'connections'
                ? 'border-sky-500 text-sky-600 bg-sky-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M12 12h.01" />
              <path d="M17 12h.01" />
            </svg>
            Connections ({connections.length})
          </button>

          <button
            onClick={() => setActiveTab('sensors')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition-all ${
              activeTab === 'sensors'
                ? 'border-sky-500 text-sky-600 bg-sky-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
            Sensors &amp; Registers ({sensors.length})
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: CONNECTIONS PAGE                                               */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'connections' && (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Connection Configuration</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage communication settings used to connect SensorHub to Modbus devices or gateways.
                </p>
              </div>
              <button
                onClick={openNewConnectionDrawer}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-98 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Connection
              </button>
            </div>

            {/* Connections Table Card */}
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
                    {connections.map((conn) => {
                      const connSensors = sensors.filter((s) => s.connectionId === conn.id);
                      return (
                        <tr key={conn.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {conn.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {conn.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">
                            {conn.type === 'Serial Port'
                              ? `${conn.serialPort} (${conn.baudRate}-${conn.dataBits}-${conn.parity?.[0]}-${conn.stopBits})`
                              : `${conn.host}:${conn.serverPort}`}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                conn.status === 'Connected'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : conn.status === 'Testing'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  conn.status === 'Connected'
                                    ? 'bg-emerald-500 animate-pulse'
                                    : 'bg-rose-500'
                                }`}
                              />
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
                              {connSensors.length} {connSensors.length === 1 ? 'Sensor' : 'Sensors'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {conn.lastChecked}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => openEditConnectionDrawer(conn)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openEditConnectionDrawer(conn)}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SENSORS PAGE                                                   */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sensors' && (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sensor &amp; Register Setup</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure Modbus slave devices and registers read through existing connections.
                </p>
              </div>
              <button
                onClick={openNewSensorDrawer}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-98 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Sensor
              </button>
            </div>

            {/* Sensors Table Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">Sensor Name</th>
                      <th className="px-6 py-4">Connection</th>
                      <th className="px-6 py-4">Slave ID</th>
                      <th className="px-6 py-4">Function</th>
                      <th className="px-6 py-4">Register</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Scan Rate</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {sensors.map((s) => {
                      const conn = connections.find((c) => c.id === s.connectionId);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {s.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-slate-800">
                              {conn?.name || 'Unknown Gateway'}
                            </span>
                            <p className="text-[10px] font-mono text-slate-400">
                              {conn?.host ? `${conn.host}:${conn.serverPort}` : conn?.serialPort}
                            </p>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-800">
                            #{s.slaveId}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                            {s.functionCode === '01'
                              ? '01 Read Coils'
                              : s.functionCode === '02'
                              ? '02 Read Discrete Inputs'
                              : s.functionCode === '03'
                              ? '03 Holding Registers'
                              : '04 Input Registers'}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">
                            {s.startAddress}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">
                            {s.quantity}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {s.scanRate} ms
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                s.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {s.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => openEditSensorDrawer(s)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleTestReadSensor(s)}
                              className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                            >
                              Test Read
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ADD / EDIT CONNECTION DRAWER                                          */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {isConnectionDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-all">
            <div className="w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto flex flex-col justify-between p-6 md:p-8 animate-page-entry">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {editingConnection ? 'Edit Connection Configuration' : 'Add Connection Configuration'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Defines HOW SensorHub connects to a gateway or physical serial bus.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsConnectionDrawerOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveConnection} className="mt-6 space-y-6">
                  {/* Connection Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Connection Name
                    </label>
                    <input
                      type="text"
                      required
                      value={connName}
                      onChange={(e) => setConnName(e.target.value)}
                      placeholder="e.g. Main Factory Gateway"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Connection Type */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Connection Type
                    </label>
                    <select
                      value={connType}
                      onChange={(e) => setConnType(e.target.value as ConnectionType)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="Serial Port">Serial Port</option>
                      <option value="Modbus TCP/IP">Modbus TCP/IP</option>
                      <option value="Modbus RTU over TCP/IP">Modbus RTU over TCP/IP</option>
                      <option value="Modbus RTU over UDP/IP">Modbus RTU over UDP/IP</option>
                    </select>

                    {/* Explanation Box */}
                    <div className="mt-2.5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-800">
                      💡 {CONNECTION_TYPE_DESCRIPTIONS[connType]}
                    </div>
                  </div>

                  {/* ── TYPE 1: SERIAL PORT SETTINGS ─────────────────────────────── */}
                  {connType === 'Serial Port' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Serial Settings</h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Serial Port</label>
                          <select
                            value={serialPort}
                            onChange={(e) => setSerialPort(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          >
                            <option value="COM1">COM1</option>
                            <option value="COM2">COM2</option>
                            <option value="COM3">COM3</option>
                            <option value="COM4">COM4</option>
                            <option value="/dev/ttyUSB0">/dev/ttyUSB0</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Baud Rate</label>
                          <select
                            value={baudRate}
                            onChange={(e) => setBaudRate(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          >
                            {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Data Bits</label>
                          <select
                            value={dataBits}
                            onChange={(e) => setDataBits(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          >
                            <option value={7}>7</option>
                            <option value={8}>8</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Parity</label>
                          <select
                            value={parity}
                            onChange={(e) => setParity(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          >
                            <option value="None">None</option>
                            <option value="Even">Even</option>
                            <option value="Odd">Odd</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Stop Bits</label>
                          <select
                            value={stopBits}
                            onChange={(e) => setStopBits(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          >
                            <option value={1}>1</option>
                            <option value={1.5}>1.5</option>
                            <option value={2}>2</option>
                          </select>
                        </div>
                      </div>

                      {/* Modbus Mode */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Modbus Mode</label>
                        <div className="flex gap-6 text-sm font-medium">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="modbusMode"
                              checked={modbusMode === 'RTU'}
                              onChange={() => setModbusMode('RTU')}
                              className="text-sky-600"
                            />
                            RTU
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="modbusMode"
                              checked={modbusMode === 'ASCII'}
                              onChange={() => setModbusMode('ASCII')}
                              className="text-sky-600"
                            />
                            ASCII
                          </label>
                        </div>
                      </div>

                      {/* Collapsible Advanced Settings */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAdvancedSerial(!showAdvancedSerial)}
                          className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                        >
                          {showAdvancedSerial ? '▲ Hide Advanced Serial Settings' : '▼ Advanced Settings (RTS/DTR)'}
                        </button>

                        {showAdvancedSerial && (
                          <div className="mt-3 grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-600 mb-1">RTS Control</label>
                              <select
                                value={rtsControl}
                                onChange={(e) => setRtsControl(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium"
                              >
                                <option value="None">None</option>
                                <option value="Enable">Enable</option>
                                <option value="Handshake">Handshake</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-600 mb-1">DTR Control</label>
                              <select
                                value={dtrControl}
                                onChange={(e) => setDtrControl(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium"
                              >
                                <option value="None">None</option>
                                <option value="Enable">Enable</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── TYPE 2: MODBUS TCP/IP ───────────────────────────────────── */}
                  {connType === 'Modbus TCP/IP' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Remote Modbus Server</h4>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">IP Address / Hostname</label>
                          <input
                            type="text"
                            required
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            placeholder="192.168.0.7"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Server Port</label>
                          <input
                            type="number"
                            required
                            value={serverPort}
                            onChange={(e) => setServerPort(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-semibold text-slate-600">IP Version</span>
                        <div className="flex gap-4 text-xs font-medium">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="ipVer"
                              checked={ipVersion === 'IPv4'}
                              onChange={() => setIpVersion('IPv4')}
                            />
                            IPv4
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="ipVer"
                              checked={ipVersion === 'IPv6'}
                              onChange={() => setIpVersion('IPv6')}
                            />
                            IPv6
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Auto Reconnect</p>
                          <p className="text-[10px] text-slate-500">Automatically retry TCP connection if socket drops</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoReconnect}
                          onChange={(e) => setAutoReconnect(e.target.checked)}
                          className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* ── TYPE 3: MODBUS RTU OVER TCP/IP ──────────────────────────── */}
                  {connType === 'Modbus RTU over TCP/IP' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">TCP Socket Network Settings</h4>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">IP Address / Hostname</label>
                          <input
                            type="text"
                            required
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            placeholder="192.168.1.120"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Server Port</label>
                          <input
                            type="number"
                            required
                            value={serverPort}
                            onChange={(e) => setServerPort(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">RTU Framing Settings</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">CRC Handling</label>
                            <select
                              value={crcHandling}
                              onChange={(e) => setCrcHandling(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
                            >
                              <option value="Standard Modbus CRC">Standard Modbus CRC</option>
                              <option value="Ignore CRC">Ignore CRC Validation</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Frame Timeout (ms)</label>
                            <input
                              type="number"
                              value={frameTimeout}
                              onChange={(e) => setFrameTimeout(Number(e.target.value))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── TYPE 4: MODBUS RTU OVER UDP/IP ──────────────────────────── */}
                  {connType === 'Modbus RTU over UDP/IP' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">UDP Datagram Settings</h4>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Remote IP Address</label>
                          <input
                            type="text"
                            required
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            placeholder="10.0.4.15"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Remote Port</label>
                          <input
                            type="number"
                            required
                            value={serverPort}
                            onChange={(e) => setServerPort(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Local Port</label>
                          <input
                            type="text"
                            value={localPort}
                            onChange={(e) => setLocalPort(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">UDP Response Mode</label>
                          <select
                            value={udpResponseMode}
                            onChange={(e) => setUdpResponseMode(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
                          >
                            <option value="Wait for response">Wait for response</option>
                            <option value="Fire and forget">Fire and forget</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── COMMON TIMING SETTINGS ────────────────────────────────────── */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Communication Timing</h4>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-700">Response Timeout (ms)</label>
                        <span className="font-mono text-xs font-bold text-sky-600">{responseTimeout} ms</span>
                      </div>
                      <input
                        type="number"
                        required
                        value={responseTimeout}
                        onChange={(e) => setResponseTimeout(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        How long SensorHub waits for a Modbus response before marking the request as failed.
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-700">Delay Between Polls (ms)</label>
                        <span className="font-mono text-xs font-bold text-sky-600">{delayBetweenPolls} ms</span>
                      </div>
                      <input
                        type="number"
                        required
                        value={delayBetweenPolls}
                        onChange={(e) => setDelayBetweenPolls(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Minimum delay before sending the next Modbus request.
                      </p>
                    </div>
                  </div>

                  {/* Test Connection Result Box */}
                  {testState.status !== 'idle' && (
                    <div
                      className={`rounded-xl p-3.5 text-xs font-bold ${
                        testState.status === 'testing'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse'
                          : testState.status === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {testState.status === 'testing' && '⚡ Testing connection to gateway...'}
                      {testState.status === 'success' && (
                        <div className="flex items-center justify-between">
                          <span>✓ {testState.message}</span>
                          <span className="font-mono">Latency: {testState.latencyMs} ms</span>
                        </div>
                      )}
                      {testState.status === 'failed' && `✕ ${testState.message}`}
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsConnectionDrawerOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testState.status === 'testing'}
                      className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 active:scale-98 transition-all"
                    >
                      Test Connection
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-98 transition-all"
                    >
                      Save Connection
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ADD / EDIT SENSOR DRAWER                                             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {isSensorDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-all">
            <div className="w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto flex flex-col justify-between p-6 md:p-8 animate-page-entry">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {editingSensor ? 'Edit Sensor / Register Definition' : 'Add Sensor / Register Definition'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Defines WHAT Modbus registers should be read after establishing a connection.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSensorDrawerOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveSensor} className="mt-6 space-y-6">
                  {/* Sensor Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Sensor Name
                    </label>
                    <input
                      type="text"
                      required
                      value={sensorName}
                      onChange={(e) => setSensorName(e.target.value)}
                      placeholder="e.g. Temperature Sensor 01"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Target Connection Dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Target Gateway Connection
                    </label>
                    <select
                      value={sensorConnectionId}
                      onChange={(e) => setSensorConnectionId(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                    >
                      {connections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>

                    {/* Connection Summary Card */}
                    {selectedConnectionSummary && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{selectedConnectionSummary.name}</p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {selectedConnectionSummary.type} • {selectedConnectionSummary.host ? `${selectedConnectionSummary.host}:${selectedConnectionSummary.serverPort}` : selectedConnectionSummary.serialPort}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 border border-emerald-200">
                          {selectedConnectionSummary.status}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Slave ID & Function Code */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Slave ID / Unit ID
                      </label>
                      <input
                        type="number"
                        required
                        value={slaveId}
                        onChange={(e) => setSlaveId(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Function Code
                      </label>
                      <select
                        value={functionCode}
                        onChange={(e) => setFunctionCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
                      >
                        <option value="01">01 — Read Coils</option>
                        <option value="02">02 — Read Discrete Inputs</option>
                        <option value="03">03 — Read Holding Registers</option>
                        <option value="04">04 — Read Input Registers</option>
                      </select>
                    </div>
                  </div>

                  {/* Start Address & Quantity */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Start Address
                      </label>
                      <input
                        type="number"
                        required
                        value={startAddress}
                        onChange={(e) => setStartAddress(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Scan Rate (ms)
                      </label>
                      <input
                        type="number"
                        required
                        value={scanRate}
                        onChange={(e) => setScanRate(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Timeout Option Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Response Timeout</p>
                      <p className="text-[11px] text-slate-500">Use connection default timeout setting</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={useConnDefaultTimeout}
                      onChange={(e) => setUseConnDefaultTimeout(e.target.checked)}
                      className="h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                    />
                  </div>

                  {!useConnDefaultTimeout && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Timeout (ms)</label>
                      <input
                        type="number"
                        value={customTimeout}
                        onChange={(e) => setCustomTimeout(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                      />
                    </div>
                  )}

                  {/* ── REGISTER MAPPING SECTION ───────────────────────────────────── */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Register Mapping (Data Definitions)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Map returned registers to aliases, data types, and scale multipliers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addRegisterMappingRow}
                        className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
                      >
                        + Add Mapping
                      </button>
                    </div>

                    {/* Endianness Controls */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
                      <div>
                        <span className="block font-semibold text-slate-600 mb-1">Byte Order</span>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="byteOrder"
                              checked={byteOrder === 'Big Endian'}
                              onChange={() => setByteOrder('Big Endian')}
                            />
                            Big Endian
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="byteOrder"
                              checked={byteOrder === 'Little Endian'}
                              onChange={() => setByteOrder('Little Endian')}
                            />
                            Little Endian
                          </label>
                        </div>
                      </div>

                      <div>
                        <span className="block font-semibold text-slate-600 mb-1">Word Order</span>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="wordOrder"
                              checked={wordOrder === 'High Word First'}
                              onChange={() => setWordOrder('High Word First')}
                            />
                            High Word First
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="wordOrder"
                              checked={wordOrder === 'Low Word First'}
                              onChange={() => setWordOrder('Low Word First')}
                            />
                            Low Word First
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Mapping Table */}
                    <div className="overflow-x-auto pt-2">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                            <th className="pb-2">Reg Offset</th>
                            <th className="pb-2">Alias / Field</th>
                            <th className="pb-2">Data Type</th>
                            <th className="pb-2">Scale</th>
                            <th className="pb-2">Unit</th>
                            <th className="pb-2 text-right">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {registerMappings.map((m) => (
                            <tr key={m.id}>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  value={m.registerOffset}
                                  onChange={(e) => updateRegisterMappingRow(m.id, 'registerOffset', Number(e.target.value))}
                                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="text"
                                  value={m.alias}
                                  onChange={(e) => updateRegisterMappingRow(m.id, 'alias', e.target.value)}
                                  className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <select
                                  value={m.dataType}
                                  onChange={(e) => updateRegisterMappingRow(m.id, 'dataType', e.target.value as any)}
                                  className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium"
                                >
                                  {['Int16', 'UInt16', 'Int32', 'UInt32', 'Float32', 'Boolean', 'Hex', 'Raw'].map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={m.scale}
                                  onChange={(e) => updateRegisterMappingRow(m.id, 'scale', Number(e.target.value))}
                                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="text"
                                  value={m.unit}
                                  onChange={(e) => updateRegisterMappingRow(m.id, 'unit', e.target.value)}
                                  placeholder="°C, %"
                                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium"
                                />
                              </td>
                              <td className="py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeRegisterMappingRow(m.id)}
                                  className="text-rose-500 font-bold hover:underline"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSensorDrawerOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestReadSensor()}
                      className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 active:scale-98 transition-all"
                    >
                      Test Read
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-98 transition-all"
                    >
                      Save Sensor
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* LIVE TEST SENSOR READ RESULT MODAL                                    */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {(isTestingSensorRead || liveTestResult) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-page-entry">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-base font-bold text-slate-900">Live Modbus Test Read</h3>
                </div>
                <button
                  onClick={() => {
                    setIsTestingSensorRead(false);
                    setLiveTestResult(null);
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              {isTestingSensorRead && (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
                  <p className="text-xs font-bold text-slate-600">Sending Modbus read request...</p>
                </div>
              )}

              {liveTestResult && (
                <div className="mt-4 space-y-4">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-medium block">Connection</span>
                      <span className="font-mono font-bold text-slate-800">{liveTestResult.connectionInfo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Slave ID</span>
                      <span className="font-mono font-bold text-slate-800">#{liveTestResult.slaveId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Function Code</span>
                      <span className="font-mono font-bold text-slate-800">{liveTestResult.functionCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Register Range</span>
                      <span className="font-mono font-bold text-slate-800">{liveTestResult.registerRange}</span>
                    </div>
                  </div>

                  {/* Raw Response */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Raw Response
                    </h4>
                    <div className="rounded-xl bg-slate-900 p-3 text-xs font-mono text-emerald-400 space-y-1">
                      {liveTestResult.rawResponse.map((r) => (
                        <div key={r.register} className="flex justify-between">
                          <span>Register {r.register}:</span>
                          <span className="font-bold text-white">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Parsed Data */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Parsed Data Results
                    </h4>
                    <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs space-y-1.5">
                      {liveTestResult.parsedData.map((pd, i) => (
                        <div key={i} className="flex justify-between font-bold text-slate-800">
                          <span>{pd.alias}:</span>
                          <span className="text-sky-700">{pd.value} {pd.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Response Time Badge */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Response Time</span>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-mono font-bold text-emerald-700">
                      {liveTestResult.responseTimeMs} ms (OK)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* USED BY SENSORS MODAL                                                 */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {viewingUsedByConnection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-page-entry">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sensors Using Connection</h3>
                  <p className="text-xs text-slate-500">{viewingUsedByConnection.name}</p>
                </div>
                <button
                  onClick={() => setViewingUsedByConnection(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {sensors.filter((s) => s.connectionId === viewingUsedByConnection.id).length > 0 ? (
                  sensors
                    .filter((s) => s.connectionId === viewingUsedByConnection.id)
                    .map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                        <div>
                          <p className="font-bold">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Slave ID #{s.slaveId} • Function {s.functionCode}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          {s.status}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-400 font-medium py-4 text-center">No sensors currently using this connection.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
