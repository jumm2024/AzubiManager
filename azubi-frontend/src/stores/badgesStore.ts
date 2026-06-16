import { dashboardApi, termineApi } from '../api/client';

type Listener = () => void;

let badges: Record<string, number> = {};
const listeners = new Set<Listener>();

export function getBadges() {
  return badges;
}

export function setBadges(next: Record<string, number>) {
  badges = next;
  listeners.forEach(l => l());
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateBadges(updater: (prev: Record<string, number>) => Record<string, number>) {
  setBadges(updater(badges));
}

export async function refetchBadges() {
  try {
    const [dashboardRes, termineRes] = await Promise.all([
      dashboardApi.get(),
      termineApi.alle(0, 200),
    ]);
    const res = dashboardRes.data;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const anstehend = termineRes.data.items.filter(
      t => new Date(t.datum) >= today
    ).length;
    setBadges({
      aufgaben: res.offeneAufgaben,
      termine: anstehend,
      notizen: res.notizenGesamt,
      teilnehmer: res.betreuteTeilnehmer,
    });
  } catch { /* ignore */ }
}
