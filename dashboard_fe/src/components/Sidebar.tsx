'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '🏠' },
  { name: 'Connections', href: '/connections', icon: '🔌' },
  { name: 'Sensors', href: '/sensors', icon: '📟' },
  { name: 'Scheduler', href: '/scheduler', icon: '⏱️' },
  { name: 'Logs', href: '/logs', icon: '📋' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-bg-sidebar border-r border-border-subtle transition-all duration-300 z-50 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border-subtle">
          {!collapsed && (
            <span className="text-lg font-bold text-accent-teal">SensorHub</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-bg-card-hover text-text-secondary transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-bg-card-hover text-accent-teal border-l-3 border-accent-teal'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.name : undefined}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle">
          {!collapsed && (
            <div className="text-xs text-text-secondary">
              SensorHub v1.0.0
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}