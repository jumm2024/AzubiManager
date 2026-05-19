import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { authApi } from '../api/client';

interface SidebarProps {
  badges: Record<string, number>;
}

export default function Sidebar({ badges }: SidebarProps) {
  const { user, logout, updateUser } = useAuth();
  const [pwModal, setPwModal] = useState(false);
  const [pwAlt, setPwAlt] = useState('');
  const [pwNeu, setPwNeu] = useState('');
  const [pwFehler, setPwFehler] = useState('');
  const [pwErfolg, setPwErfolg] = useState('');
  const [pwLade, setPwLade] = useState(false);

  if (user && user.passwortGeandert === false && !pwModal) {
    setPwModal(true);
  }

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
      setTimeout(() => setPwModal(false), 1500);
    } catch (err: any) {
      const d = err.response?.data;
      if (typeof d === 'string') setPwFehler(d);
      else if (d?.fehler) setPwFehler(d.fehler);
      else setPwFehler('Fehler beim Ändern');
    } finally {
      setPwLade(false);
    }
  };

  const links: { to: string; label: string; badgeKey?: string; badgeColor?: string }[] = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/tagesstatus', label: 'Tagesstatus' },
    { to: '/teilnehmer', label: 'Teilnehmer', badgeKey: 'teilnehmer', badgeColor: 'bg-cyan-500' },
    { to: '/aufgaben', label: 'Aufgaben', badgeKey: 'aufgaben', badgeColor: 'bg-orange-500' },
    { to: '/termine', label: 'Termine', badgeKey: 'termine', badgeColor: 'bg-indigo-500' },
    { to: '/notizen', label: 'Information', badgeKey: 'notizen', badgeColor: 'bg-pink-500' },
  ];

  const initials = user?.vorname
    ? (user.vorname[0] + (user.benutzername ? user.benutzername[0] : '')).toUpperCase()
    : (user?.benutzername?.[0] || 'U').toUpperCase();

  return (
    <aside className="w-[260px] bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-50 shadow-2xl">
      <div className="px-6 py-7 border-b border-slate-700/40">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold tracking-wide shadow-lg shadow-blue-500/20">
            {initials}
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-wide text-white/90">AzubiManager</h1>
            <p className="text-[11px] font-light text-slate-400 mt-0.5 tracking-wide">{user?.vorname || user?.benutzername}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Navigation</div>
        {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600/15 text-white border border-blue-500/20 shadow-sm shadow-blue-500/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`
              }
            >
              <span className="flex-1">{link.label}</span>
              {link.badgeKey && badges[link.badgeKey] > 0 && (
                <span className={`${link.badgeColor} text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md min-w-[20px] text-center leading-tight`}>
                  {badges[link.badgeKey]}
                </span>
              )}
            </NavLink>
          ))}
        {user?.rolle === 'Admin' && (
          <>
            <div className="pt-3 mt-3 border-t border-slate-700/40 px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Verwaltung</div>
            <NavLink
              to="/benutzer"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600/15 text-white border border-blue-500/20 shadow-sm shadow-blue-500/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`
              }
            >
              <span className="flex-1">Benutzer</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-slate-700/40">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-2 rounded-xl bg-white/[0.03]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/80 truncate">{user?.vorname || user?.benutzername}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.rolle}</p>
          </div>
        </div>
        <button onClick={() => { setPwFehler(''); setPwErfolg(''); setPwAlt(''); setPwNeu(''); setPwModal(true); }}
          className="flex items-center gap-3 w-full px-3 py-2 text-[12px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all">
          <span>Passwort ändern</span>
        </button>
        <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 text-[12px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all">
          <span>Abmelden</span>
        </button>
      </div>

      {pwModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]" onClick={() => setPwModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 text-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Passwort ändern</h3>
              <button onClick={() => setPwModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handlePwAendern} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Altes Passwort</label>
                <input type="password" value={pwAlt} onChange={(e) => setPwAlt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
                <input type="password" value={pwNeu} onChange={(e) => setPwNeu(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required minLength={6} />
              </div>

              {pwFehler && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{pwFehler}</div>
              )}
              {pwErfolg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{pwErfolg}</div>
              )}

              <button type="submit" disabled={pwLade}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {pwLade ? 'Wird geändert...' : 'Passwort ändern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
