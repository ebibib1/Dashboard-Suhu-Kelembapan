'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '⌂' },
  { name: 'Connections', href: '/connections', icon: '⌁' },
  { name: 'Sensors', href: '/sensors', icon: '◉' },
  { name: 'Scheduler', href: '/scheduler', icon: '◷' },
  { name: 'Logs', href: '/logs', icon: '▤' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={`fixed left-0 top-0 z-50 h-16 w-full border-b border-border-subtle bg-bg-sidebar transition-all duration-300 md:h-screen md:border-b-0 md:border-r ${collapsed ? 'md:w-16' : 'md:w-64'}`}>
      <div className="flex h-full flex-row md:flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b-0 border-border-subtle px-4 md:border-b">
          {!collapsed && <span className="text-lg font-bold text-accent-teal">SensorHub</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-card-hover" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="scrollbar-thin flex flex-1 items-center gap-1 overflow-x-auto px-2 py-2 md:block md:space-y-1 md:overflow-y-auto md:overflow-x-hidden md:py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return <Link key={item.name} href={item.href} title={collapsed ? item.name : undefined} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 transition-all duration-200 md:gap-3 ${isActive ? 'border-l-0 bg-bg-card-hover text-accent-teal md:border-l-3 md:border-accent-teal' : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'} ${collapsed ? 'md:justify-center' : ''}`}><span className="flex-shrink-0 text-lg">{item.icon}</span>{!collapsed && <span className="font-medium">{item.name}</span>}</Link>;
          })}
        </nav>
        <div className="hidden border-t border-border-subtle p-4 md:block">{!collapsed && <div className="text-xs text-text-secondary">SensorHub v1.0.0</div>}</div>
      </div>
    </aside>
  );
}