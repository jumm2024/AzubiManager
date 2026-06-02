import { Outlet, useOutletContext } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/client';
import { Menu, X } from 'lucide-react';

type BadgesContext = { refetchBadges: () => void };

export function useBadgesContext() {
  return useOutletContext<BadgesContext>();
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery<Record<string, number>>({
    queryKey: ['badges'],
    queryFn: () => dashboardApi.get().then(res => ({
      aufgaben: res.data.aufgabenGesamt,
      termine: res.data.termineGesamt,
      notizen: res.data.notizenGesamt,
      teilnehmer: res.data.betreuteTeilnehmer,
    })),
    staleTime: 30_000,
  });

  const refetchBadges = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['badges'] });
  }, [queryClient]);

  return (
    <div className="flex min-h-screen">
      <Sidebar badges={data ?? {}} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
        <Outlet context={{ refetchBadges }} />
      </main>
    </div>
  );
}
