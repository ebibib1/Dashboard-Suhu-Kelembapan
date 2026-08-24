'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; label: string };
  status?: 'connected' | 'disconnected' | 'unknown';
  sparkline?: number[];
  accent?: 'teal' | 'pink' | 'orange';
  className?: string;
}

export default function MetricCard({ label, value, unit, trend, status, sparkline, accent = 'teal', className }: MetricCardProps) {
  const statusColors = {
    connected: 'text-accent-green bg-accent-green/15',
    disconnected: 'text-accent-red bg-accent-red/15',
    unknown: 'text-text-secondary bg-border-subtle/50',
  };
  const statusLabels = { connected: 'Terhubung', disconnected: 'Terputus', unknown: 'Unknown' };
  const accentColor = { teal: 'var(--accent-teal)', pink: 'var(--accent-pink)', orange: 'var(--accent-orange)' }[accent];
  const chartValues = sparkline && sparkline.length > 1 ? sparkline : [];
  const min = chartValues.length ? Math.min(...chartValues) : 0;
  const max = chartValues.length ? Math.max(...chartValues) : 1;
  const range = max - min || 1;
  const points = chartValues.map((item, index) => `${(index / (chartValues.length - 1)) * 200},${45 - ((item - min) / range) * 35}`).join(' ');

  return (
    <div className={`rounded-2xl border border-border-subtle bg-bg-card p-5 transition-all hover:bg-bg-card-hover ${className || ''}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{label}</span>
        {status && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status]}`}>{statusLabels[status]}</span>}
      </div>
      <div className="mb-2"><span className="text-3xl font-bold text-text-primary">{value}</span>{unit && <span className="ml-2 text-lg font-medium text-text-secondary">{unit}</span>}</div>
      {trend && <div className={`flex items-center gap-1 text-sm ${trend.value >= 0 ? 'text-accent-green' : 'text-accent-red'}`}><span>{trend.value >= 0 ? '▲' : '▼'}</span><span>{Math.abs(trend.value).toFixed(1)}%</span><span className="text-text-secondary">{trend.label}</span></div>}
      {chartValues.length > 1 && <div className="mt-3 h-12"><svg viewBox="0 0 200 50" className="h-full w-full" preserveAspectRatio="none" aria-label={`${label} sparkline`}><polyline fill="none" stroke={accentColor} strokeWidth="2.5" points={points} vectorEffect="non-scaling-stroke" /></svg></div>}
    </div>
  );
}