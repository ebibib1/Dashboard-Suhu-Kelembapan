'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      name: 'Scheduler',
      href: '/scheduler',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      ),
    },
    {
      name: 'Sensors',
      href: '/sensors',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      name: 'Logs',
      href: '/logs',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" x2="18" y1="20" y2="10" />
          <line x1="12" x2="12" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="14" />
        </svg>
      ),
    },
    {
      name: 'Connections',
      href: '/connections',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M12 12h.01" />
          <path d="M17 12h.01" />
          <path d="M22 10V8a2 2 0 0 0-2-2h-4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Trigger Edge Handle (>) - Floating on the left edge */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 w-6 group flex items-center justify-start cursor-pointer"
        onMouseEnter={() => setIsOpen(true)}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-12 w-8 items-center justify-center rounded-r-2xl bg-slate-900 text-sky-400 shadow-xl border-y border-r border-slate-700/50 transition-all duration-300 ${
            isOpen ? 'opacity-0 pointer-events-none' : 'opacity-90 hover:opacity-100 hover:w-10'
          }`}
          title="Buka Menu Sidebar"
        >
          <svg className="h-5 w-5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Hoverable / Sliding Sidebar Container */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 flex items-stretch transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <aside className="w-64 flex flex-col justify-between bg-slate-950/95 backdrop-blur-md text-white py-6 px-4 shadow-2xl border-r border-slate-800/80">
          {/* Logo / Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 px-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-slate-950 font-black">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 8h4.5a2.5 2.5 0 0 1 0 5H9m0 0h5.5a2.5 2.5 0 0 1 0 5H9V8z" />
                </svg>
              </div>
              <div>
                <h2 className="font-extrabold text-base tracking-tight text-white">SensorHub</h2>
                <p className="text-[10px] text-sky-400 font-medium uppercase tracking-wider">IoT Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Tutup Menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2 my-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:translate-x-1 active:scale-98 ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-inner font-bold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`${isActive ? 'text-sky-400' : 'text-slate-400'}`}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Info */}
          <div className="pt-4 border-t border-slate-800/80 px-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Sidebar (Hover Edge)</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </aside>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-950 px-4 md:hidden">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-900 ${
                isActive ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}