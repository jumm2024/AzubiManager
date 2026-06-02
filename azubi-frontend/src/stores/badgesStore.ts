import { dashboardApi } from '../api/client';

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
  console.log('updateBadges called, current badges:', JSON.stringify(badges));
  const next = updater(badges);
  console.log('calculated next:', JSON.stringify(next));
  setBadges(next);
}

export async function refetchBadges() {
  console.log('refetchBadges called');
  try {
    const res = await dashboardApi.get();
    console.log('dashboard API result:', res.data.aufgabenGesamt);
    setBadges({
      aufgaben: res.data.aufgabenGesamt,
      termine: res.data.termineGesamt,
      notizen: res.data.notizenGesamt,
      teilnehmer: res.data.betreuteTeilnehmer,
    });
  } catch (e) { console.error('refetchBadges error:', e); }
}
