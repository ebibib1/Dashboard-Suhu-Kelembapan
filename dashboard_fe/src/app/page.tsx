'use client';

import Sidebar from '@/components/Sidebar';
import DashboardHome from '@/components/DashboardHome';

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <DashboardHome />
    </div>
  );
}