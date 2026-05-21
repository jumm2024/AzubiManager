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
} from 'lucide-react';

interface SidebarProps {
  badges: Record<string, number>;
}

interface DashboardStats {
  anwesend: number;
  gesamt: number;
  offen: number;
  betreuteTeilnehmer: number;
}

export default function Sidebar({ badges }: SidebarProps) {
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

  const heute = new Date();
  const datumText = heute.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }).toUpperCase();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tagesstatus', label: 'Tagesstatus', icon: Activity },
    { to: '/teilnehmer', label: 'Teilnehmer', icon: Users, badgeKey: 'teilnehmer' },
    { to: '/aufgaben', label: 'Aufgaben', icon: CheckSquare, badgeKey: 'aufgaben' },
    { to: '/termine', label: 'Termine', icon: Calendar, badgeKey: 'termine' },
    { to: '/notizen', label: 'Information', icon: Info, badgeKey: 'notizen', subtitle: 'neue Mitteilungen' },
  ];

  const initials = user?.vorname
    ? (user.vorname[0] + (user.benutzername ? user.benutzername[0] : '')).toUpperCase()
    : (user?.benutzername?.[0] || 'U').toUpperCase();

  const attendancePercent = stats.gesamt > 0 ? (stats.anwesend / stats.gesamt) * 100 : 0;
  const attendanceSegments = Array.from({ length: 10 }, (_, i) => {
    const threshold = ((i + 1) / 10) * 100;
    return attendancePercent >= threshold;
  });

  return (
    <aside className="w-[280px] bg-[#FDF8F0] h-screen flex flex-col fixed left-0 top-0 z-50 shadow-lg border-r border-[#F0E6D6]">
      {/* Header */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-gray-800 tracking-tight">BBW AusbilderHub</h1>
            <p className="text-[11px] text-gray-500 font-medium">{user?.rolle === 'Admin' ? 'System Admin' : user?.rolle}</p>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="px-4 mb-4">
        <div className="bg-[#FFF9EE] rounded-2xl p-4 border border-[#F0E6D6] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Heute · {datumText}</span>
            {badges.aufgaben > 0 && (
              <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                {badges.aufgaben} offen
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-bold text-gray-800">{stats.betreuteTeilnehmer}</span>
            <span className="text-lg font-semibold text-gray-400">/{stats.gesamt}</span>
            <span className="text-sm font-medium text-gray-500 ml-1">Teilnehmer betreust du</span>
          </div>
          <div className="flex gap-1">
            {attendanceSegments.map((filled, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  filled ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const badge = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
          const isActive = window.location.pathname === item.to;
          const isNotizen = item.to === '/notizen';

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive: active }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  active || isNotizen
                    ? 'bg-[#FFF9EE] border border-[#F0E6D6] shadow-sm'
                    : 'hover:bg-white/60 border border-transparent'
                }`
              }
            >
              <Icon className={`w-[18px] h-[18px] ${isActive || isNotizen ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-[13px] font-medium ${isActive || isNotizen ? 'text-gray-800' : 'text-gray-600 group-hover:text-gray-800'}`}>
                  {item.label}
                </span>
                {item.subtitle && (
                  <span className="block text-[11px] text-gray-400">{badge} {item.subtitle}</span>
                )}
              </div>
              {badge > 0 && !item.subtitle && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isNotizen
                    ? 'bg-red-50 text-red-600'
                    : item.badgeKey === 'aufgaben'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {user?.rolle === 'Admin' && (
          <NavLink
            to="/benutzer"
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 mt-2 pt-4 border-t border-[#F0E6D6] ${
                isActive
                  ? 'bg-[#FFF9EE] border border-[#F0E6D6] shadow-sm'
                  : 'hover:bg-white/60 border border-transparent'
              }`
            }
          >
            <UserCog className="w-[18px] h-[18px] text-gray-400 group-hover:text-gray-600" />
            <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-800">Benutzer</span>
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#F0E6D6]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#FFF9EE] border border-[#F0E6D6] mb-2">
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-[11px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-800 truncate">{user?.vorname || user?.benutzername || 'System'}</p>
            <p className="text-[11px] text-gray-500 truncate">{user?.rolle || 'Administrator'}</p>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-100" />
        </div>

        <button
          onClick={() => { setPwFehler(''); setPwErfolg(''); setPwAlt(''); setPwNeu(''); setPwModal(true); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-xl transition-all"
        >
          <KeyRound className="w-4 h-4" />
          <span>Passwort ändern</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Abmelden</span>
        </button>
      </div>

      {/* Password Modal */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setPwModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 text-gray-800 border border-gray-100" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <h3 className="text-lg font-semibold text-gray-800">Passwort ändern</h3>
              <button onClick={() => setPwModal(false)} className="text-gray-400 hover:text-gray-600 text-lg transition-colors">✕</button>
            </div>
            <form onSubmit={handlePwAendern} className="space-y-4">
              <div>
                <label htmlFor="sidebar-pw-alt" className="block text-sm font-medium text-gray-700 mb-1.5">Altes Passwort</label>
                <input id="sidebar-pw-alt" name="altesPasswort" type="password" value={pwAlt} onChange={(e) => setPwAlt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
              </div>
              <div>
                <label htmlFor="sidebar-pw-neu" className="block text-sm font-medium text-gray-700 mb-1.5">Neues Passwort</label>
                <input id="sidebar-pw-neu" name="neuesPasswort" type="password" value={pwNeu} onChange={(e) => setPwNeu(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required minLength={6} />
              </div>

              {pwFehler && (
                <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">{pwFehler}</div>
              )}
              {pwErfolg && (
                <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">{pwErfolg}</div>
              )}

              <button type="submit" disabled={pwLade}
                className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm shadow-orange-500/20">
                {pwLade ? 'Wird geändert...' : 'Passwort ändern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
