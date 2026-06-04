import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useEffect, useReducer } from 'react';
import { Menu, X } from 'lucide-react';
import { getBadges, subscribe, refetchBadges } from '../stores/badgesStore';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, forceRender] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsub = subscribe(() => forceRender());
    refetchBadges();
    const interval = setInterval(refetchBadges, 30_000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const badges = getBadges();

  return (
    <div className="flex min-h-screen text-gray-800">
      <Sidebar badges={badges} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <button
        onClick={() => setSidebarOpen(prev => !prev)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-xl p-2.5 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label={sidebarOpen ? 'Menü schließen' : 'Menü öffnen'}
      >
        {sidebarOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
      </button>

      <main className="flex-1 p-4 md:p-6 lg:p-8 lg:ml-[280px] pt-16 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
