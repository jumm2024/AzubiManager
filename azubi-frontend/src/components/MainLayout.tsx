import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useEffect, useRef } from 'react';
import { dashboardApi } from '../api/client';

export default function MainLayout() {
  const [badges, setBadges] = useState<Record<string, number>>({});
  const pendingRef = useRef(false);

  const ladeBadges = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    try {
      const res = await dashboardApi.get();
      const d = res.data as {
        betreuteTeilnehmer?: number;
        aufgabenGesamt?: number;
        termineGesamt?: number;
        notizenGesamt?: number;
      };
      setBadges({
        aufgaben: d.aufgabenGesamt ?? 0,
        termine: d.termineGesamt ?? 0,
        notizen: d.notizenGesamt ?? 0,
        teilnehmer: d.betreuteTeilnehmer ?? 0,
      });
    } catch {
      // ignorieren
    } finally {
      pendingRef.current = false;
    }
  };

  useEffect(() => {
    void ladeBadges();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar badges={badges} />
      <main className="ml-[280px] flex-1 p-8 bg-[#F9F5F0]">
        <Outlet context={{ ladeBadges }} />
      </main>
    </div>
  );
}
