'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; label: string };
  status?: 'connected' | 'disconnected' | 'unknown';
  sparkline?: number[];
  className?: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  trend,
  status,
  sparkline,
  className,
}: MetricCardProps) {
  const statusColors = {
    connected: 'text-accent-green bg-accent-green/15',
    disconnected: 'text-accent-red bg-accent-red/15',
    unknown: 'text-text-secondary bg-border-subtle/50',
  };

  const statusLabels = {
    connected: '🟢 Terhubung',
    disconnected: '🔴 Terputus',
    unknown: '⚪ Unknown',
  };

  return (
    <div className={`bg-bg-card border border-border-subtle rounded-2xl p-5 transition-all hover:bg-bg-card-hover ${className || ''}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs uppercase tracking-wider font-semibold text-text-secondary">
          {label}
        </span>
        {status && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        )}
      </div>
      
      <div className="mb-2">
        <span className="text-3xl font-bold text-text-primary">
          {value}
        </span>
        {unit && (
          <span className="ml-2 text-lg text-text-secondary font-medium">
            {unit}
          </span>
        )}
      </div>

      {trend && (
        <div className={`flex items-center gap-1 text-sm ${trend.value >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          <span>{trend.value >= 0 ? '▲' : '▼'}</span>
          <span>{Math.abs(trend.value).toFixed(1)}%</span>
          <span className="text-text-secondary">{trend.label}</span>
        </div>
      )}

      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 h-12 relative">
          <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="var(--accent-teal)"
              strokeWidth="2"
              points={sparkline.map((v, i) => `${(i / (sparkline.length - 1)) * 200},${50 - (v / 100) * 40}`).join(' ')}
            />
          </svg>
        </div>
      )}
    </div>
  );
}