import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  badges: Record<string, number>;
}

export default function Sidebar({ badges }: SidebarProps) {
  const { user, logout } = useAuth();

  const links: { to: string; label: string; badgeKey?: string; badgeColor?: string; adminOnly?: boolean }[] = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/tagesstatus', label: 'Tagesstatus' },
    { to: '/teilnehmer', label: 'Teilnehmer', badgeKey: 'teilnehmer', badgeColor: 'bg-cyan-500' },
    { to: '/aufgaben', label: 'Aufgaben', badgeKey: 'aufgaben', badgeColor: 'bg-orange-500' },
    { to: '/termine', label: 'Termine', badgeKey: 'termine', badgeColor: 'bg-indigo-500' },
    { to: '/notizen', label: 'Information', badgeKey: 'notizen', badgeColor: 'bg-pink-500' },
    { to: '/benutzer', label: 'Benutzer', adminOnly: true },
  ];

  return (
    <aside className="w-[260px] bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white h-screen flex flex-col fixed left-0 top-0 z-50 shadow-2xl">
      <div className="px-6 py-7 border-b border-gray-800/40">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-base font-bold tracking-wide shadow-lg shadow-blue-500/20">A</div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-wide text-white/90">Teilnehmer Manager</h1>
            <p className="text-[11px] font-light text-gray-500 mt-0.5 tracking-wide">{user?.vorname || user?.benutzername}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3.5 space-y-0.5 overflow-y-auto">
        {links.filter(link => !link.adminOnly || user?.rolle === 'Admin').map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium tracking-wide rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600/10 text-white border border-blue-500/20 shadow-sm shadow-blue-500/5'
                    : 'text-gray-400/80 hover:text-white hover:bg-white/[0.04] border border-transparent'
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
      </nav>

      <div className="px-3.5 py-3.5 border-t border-gray-800/40">
        <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] font-medium text-gray-500 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all tracking-wide">
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
