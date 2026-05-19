import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useEffect } from 'react';
import { dashboardApi, teilnehmerApi, aufgabenApi, termineApi, notizenApi } from '../api/client';

export default function MainLayout() {
  const [badges, setBadges] = useState<Record<string, number>>({});

  const ladeBadges = async () => {
    try {
      const [_dashboardRes, teilnehmerRes, aufgabenRes, termineRes, notizenRes] = await Promise.all([
        dashboardApi.get(),
        teilnehmerApi.alle().catch(() => ({ data: [] })),
        aufgabenApi.alle(false).catch(() => ({ data: [] })),
        termineApi.alle().catch(() => ({ data: [] })),
        notizenApi.alle().catch(() => ({ data: [] })),
      ]);

      setBadges({
        aufgaben: aufgabenRes.data?.length ?? 0,
        termine: termineRes.data?.length ?? 0,
        notizen: notizenRes.data?.length ?? 0,
        teilnehmer: teilnehmerRes.data?.length ?? 0,
      });
    } catch {
      // ignorieren
    }
  };

  useEffect(() => {
    void ladeBadges();
  }, []); // eslint-disable-line react-hooks/set-state-in-effect

  return (
    <div className="flex min-h-screen">
      <Sidebar badges={badges} />
      <main className="ml-[260px] flex-1 p-8 bg-gray-50">
        <Outlet context={{ ladeBadges }} />
      </main>
    </div>
  );
}
