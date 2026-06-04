import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi, dashboardApi } from '../api/client';
import {
  LayoutDashboard,
  Activity,
  Users,
  CheckSquare,
  Calendar,
  Info,
  UserCog,
  Zap,
  LogOut,
  KeyRound,
  X,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  badges: Record<string, number>;
  isOpen: boolean;
  onClose: () => void;
}

interface DashboardStats {
  anwesend: number;
  gesamt: number;
  offen: number;
  betreuteTeilnehmer: number;
}

export default function Sidebar({ badges, isOpen, onClose }: SidebarProps) {
  const { user, logout, updateUser } = useAuth();
  const [pwModal, setPwModal] = useState(false);
  const [pwAlt, setPwAlt] = useState('');
  const [pwNeu, setPwNeu] = useState('');
  const [pwFehler, setPwFehler] = useState('');
  const [pwErfolg, setPwErfolg] = useState('');
  const [pwLade, setPwLade] = useState(false);

  const { data: statsData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(res => res.data),
    staleTime: 30_000,
  });

  const stats: DashboardStats = {
    anwesend: statsData?.anwesend ?? 0,
    gesamt: statsData?.teilnehmerGesamt ?? 0,
    offen: statsData?.offeneAufgaben ?? 0,
    betreuteTeilnehmer: statsData?.betreuteTeilnehmer ?? 0,
  };

  if (user && user.passwortGeandert === false && !pwModal) {
    setPwModal(true);
  }

  const pwTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handlePwAendern = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwFehler('');
    setPwErfolg('');
    if (!pwAlt.trim()) { setPwFehler('Altes Passwort eingeben'); return; }
    if (pwNeu.length < 6) { setPwFehler('Neues Passwort muss mindestens 6 Zeichen haben'); return; }
    setPwLade(true);
    try {
      await authApi.passwortAendern(pwAlt, pwNeu);
      updateUser({ passwortGeandert: true });
      setPwErfolg('Passwort geändert');
      setPwAlt('');
      setPwNeu('');
      pwTimerRef.current = setTimeout(() => setPwModal(false), 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string | { fehler?: string } } };
      const d = error.response?.data;
      if (typeof d === 'string') setPwFehler(d);
      else if (d?.fehler) setPwFehler(d.fehler);
      else setPwFehler('Fehler beim Ändern');
    } finally {
      setPwLade(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pwTimerRef.current) clearTimeout(pwTimerRef.current);
    };
  }, []);

  const jetzt = new Date();
  const wochentag = jetzt.toLocaleDateString('de-DE', { weekday: 'long' });
  const datumText = jetzt.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  const uhrzeit = jetzt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tagesstatus', label: 'Tagesstatus', icon: Activity },
    { to: '/teilnehmer', label: 'Teilnehmer', icon: Users, badgeKey: 'teilnehmer' },
    { to: '/aufgaben', label: 'Aufgaben', icon: CheckSquare, badgeKey: 'aufgaben' },
    { to: '/termine', label: 'Termine', icon: Calendar, badgeKey: 'termine' },
    { to: '/notizen', label: 'Information', icon: Info, badgeKey: 'notizen' },
  ];

  const initials = user?.vorname
    ? (user.vorname[0] + (user.benutzername ? user.benutzername[0] : '')).toUpperCase()
    : (user?.benutzername?.[0] || 'U').toUpperCase();

  const attendancePercent = stats.gesamt > 0 ? (stats.betreuteTeilnehmer / stats.gesamt) * 100 : 0;
  const attendanceSegments = Array.from({ length: 10 }, (_, i) => {
    const threshold = ((i + 1) / 10) * 100;
    return attendancePercent >= threshold;
  });

  return (
    <aside className={`w-[280px] bg-gradient-to-b from-[#0F0A1F] via-[#0A0716] to-[#07050E] h-screen flex flex-col fixed left-0 top-0 z-50 shadow-2xl border-r border-white/5 transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0`}>
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-5 h-5 text-white" fill="white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight">AusbilderHub</h1>
            <p className="text-[11px] text-gray-500 font-medium">v2.4 · prod</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors" aria-label="Menü schließen">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 mb-6">
        <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/5">
          <div className="text-[11px] font-medium text-gray-500 mb-3">
            {wochentag} · {datumText} · {uhrzeit}
          </div>
          <div className="mb-3 leading-tight">
            <span className="text-[22px] font-bold text-white">{stats.betreuteTeilnehmer} von {stats.gesamt}</span>
            <span className="text-[14px] text-gray-400"> Azubis sind </span>
            <span className="text-[14px] italic text-violet-300">betreut</span>
          </div>
          <div className="flex gap-1">
            {attendanceSegments.map((filled, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  filled ? 'bg-violet-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const badge = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
          const isNotizen = item.to === '/notizen';

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => {
                const active = isActive || isNotizen;
                return `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 border ${
                  active
                    ? 'bg-white/[0.06] border-white/10'
                    : 'border-transparent hover:bg-white/[0.03]'
                }`;
              }}
            >
              {({ isActive }) => {
                const active = isActive || isNotizen;
                return (
                  <>
                    <Icon className={`w-[18px] h-[18px] ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`} />
                    <span className={`flex-1 text-[13px] font-medium ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'} transition-colors`}>
                      {item.label}
                    </span>
                    {badge > 0 && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                        {item.badgeKey === 'aufgaben' && <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_2px] shadow-yellow-400/70 animate-pulse" />}
                        {item.badgeKey === 'notizen' && <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_2px] shadow-violet-400/70 animate-pulse" />}
                        {item.badgeKey === 'termine' && <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_2px] shadow-indigo-400/70 animate-pulse" />}
                        {item.badgeKey === 'teilnehmer' && <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_2px] shadow-blue-400/70 animate-pulse" />}
                        <span className={active ? 'text-gray-300' : 'text-gray-500'}>{badge}</span>
                      </span>
                    )}
                  </>
                );
              }}
            </NavLink>
          );
        })}

        {user?.rolle === 'Admin' && (
          <>
            <p className="px-3 pt-5 mt-3 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em] border-t border-white/5">Verwaltung</p>
            <NavLink
              to="/benutzer"
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 border ${
                  isActive
                    ? 'bg-white/[0.06] border-white/10'
                    : 'border-transparent hover:bg-white/[0.03]'
                }`
              }
            >
              <UserCog className="w-[18px] h-[18px] text-gray-500 group-hover:text-gray-300 transition-colors" />
              <span className="text-[13px] font-medium text-gray-400 group-hover:text-gray-200 transition-colors">Benutzer</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/5 mb-2">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0A0716]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{user?.vorname || user?.benutzername || 'System'}</p>
            <p className="text-[11px] text-gray-500 truncate">{user?.rolle || 'Administrator'} · seit 09:02</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </div>

        <button
          onClick={() => { setPwFehler(''); setPwErfolg(''); setPwAlt(''); setPwNeu(''); setPwModal(true); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <KeyRound className="w-4 h-4" />
          <span>Passwort ändern</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Abmelden</span>
        </button>
      </div>

      {pwModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setPwModal(false)}>
          <div className="bg-[#15101F] rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 text-white border border-white/10" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <h3 className="text-lg font-semibold text-white">Passwort ändern</h3>
              <button onClick={() => setPwModal(false)} className="text-gray-400 hover:text-white text-lg transition-colors">✕</button>
            </div>
            <form onSubmit={handlePwAendern} className="space-y-4">
              <div>
                <label htmlFor="sidebar-pw-alt" className="block text-sm font-medium text-gray-300 mb-1.5">Altes Passwort</label>
                <input id="sidebar-pw-alt" name="altesPasswort" type="password" value={pwAlt} onChange={(e) => setPwAlt(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all" required />
              </div>
              <div>
                <label htmlFor="sidebar-pw-neu" className="block text-sm font-medium text-gray-300 mb-1.5">Neues Passwort</label>
                <input id="sidebar-pw-neu" name="neuesPasswort" type="password" value={pwNeu} onChange={(e) => setPwNeu(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all" required minLength={6} />
              </div>

              {pwFehler && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">{pwFehler}</div>
              )}
              {pwErfolg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl text-sm">{pwErfolg}</div>
              )}

              <button type="submit" disabled={pwLade}
                className="w-full py-2.5 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 disabled:opacity-50 transition-colors shadow-lg shadow-violet-500/30">
                {pwLade ? 'Wird geändert...' : 'Passwort ändern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
