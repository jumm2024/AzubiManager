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
  setBadges(updater(badges));
}

export async function refetchBadges() {
  try {
    const res = await dashboardApi.get();
    setBadges({
      aufgaben: res.data.aufgabenGesamt,
      termine: res.data.termineGesamt,
      notizen: res.data.notizenGesamt,
      teilnehmer: res.data.betreuteTeilnehmer,
    });
  } catch { /* ignore */ }
}
