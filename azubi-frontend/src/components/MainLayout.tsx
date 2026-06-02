import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { Menu, X } from 'lucide-react';
import { getBadges, subscribe, refetchBadges } from '../stores/badgesStore';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const badges = useSyncExternalStore(subscribe, getBadges);

  useEffect(() => { refetchBadges(); }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar badges={badges} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <button
        onClick={() => setSidebarOpen(prev => !prev)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-xl p-2.5 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label={sidebarOpen ? 'Menü schließen' : 'Menü öffnen'}
      >
        {sidebarOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
      </button>

      <main className="flex-1 p-4 md:p-6 lg:p-8 bg-[#F9F5F0] lg:ml-[280px] pt-16 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
