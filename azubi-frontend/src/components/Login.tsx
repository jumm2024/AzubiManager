import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Zap, User, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [lade, setLade] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    setLade(true);
    try {
      await login(benutzername, passwort);
      navigate('/dashboard');
    } catch {
      setFehler('Login fehlgeschlagen');
    } finally {
      setLade(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#FAF8FF] px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#E9D5FF_0%,transparent_50%),radial-gradient(ellipse_at_top_right,#FCE7F3_0%,transparent_50%),radial-gradient(ellipse_at_bottom,#DDD6FE_0%,transparent_60%)]" />

      <div className="absolute top-[8%] left-[12%] w-2 h-2 rounded-full bg-violet-400/60 shadow-[0_0_12px_4px_rgba(167,139,250,0.4)]" />
      <div className="absolute top-[22%] right-[18%] w-1.5 h-1.5 rounded-full bg-fuchsia-400/70 shadow-[0_0_10px_3px_rgba(232,121,249,0.4)]" />
      <div className="absolute bottom-[18%] left-[20%] w-1.5 h-1.5 rounded-full bg-indigo-400/60 shadow-[0_0_10px_3px_rgba(129,140,248,0.4)]" />
      <div className="absolute bottom-[30%] right-[10%] w-2 h-2 rounded-full bg-violet-400/60 shadow-[0_0_12px_4px_rgba(167,139,250,0.4)]" />
      <div className="absolute top-[55%] left-[8%] w-1 h-1 rounded-full bg-fuchsia-400/70 shadow-[0_0_8px_2px_rgba(232,121,249,0.4)]" />

      <div className="absolute top-0 left-0 w-[28rem] h-[28rem] bg-gradient-radial from-violet-400/40 to-transparent rounded-full blur-3xl -translate-x-1/3 -translate-y-1/4" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.45) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] rounded-full blur-3xl translate-x-1/4 translate-y-1/4" style={{ background: 'radial-gradient(circle, rgba(232,121,249,0.35) 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/2 w-[26rem] h-[26rem] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.30) 0%, transparent 70%)' }} />
      <div className="absolute top-[15%] right-[5%] w-80 h-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.25) 0%, transparent 70%)' }} />

      <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgb(124 58 237)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <svg className="absolute top-[10%] left-[5%] w-32 h-32 opacity-20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" stroke="rgb(167 139 250)" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="30" stroke="rgb(167 139 250)" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="20" stroke="rgb(167 139 250)" strokeWidth="0.4" />
      </svg>
      <svg className="absolute bottom-[12%] right-[8%] w-40 h-40 opacity-20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="rgb(232 121 249)" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="35" stroke="rgb(232 121 249)" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="25" stroke="rgb(232 121 249)" strokeWidth="0.4" />
      </svg>

      <div className="relative w-full max-w-5xl bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-2xl shadow-violet-500/10 overflow-hidden grid lg:grid-cols-5">
        <div className="hidden lg:flex lg:col-span-2 relative flex-col justify-between p-10 bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 -left-16 w-72 h-72 bg-violet-400/30 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" fill="white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">AusbilderHub</p>
                <p className="text-[11px] text-violet-200 font-medium">v2.4 · prod</p>
              </div>
            </div>
          </div>

          <div className="relative space-y-6">
            <h2 className="text-3xl font-bold leading-tight">
              Willkommen zurück.<br />
              <span className="text-violet-200">Lass uns loslegen.</span>
            </h2>
            <p className="text-violet-100/80 text-sm leading-relaxed max-w-xs">
              Verwalte Auszubildende, Aufgaben und Termine an einem Ort – schnell, übersichtlich und sicher.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-violet-100/90">
                <span className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                Echtzeit-Übersicht aller Auszubildenden
              </div>
            </div>
          </div>

          <div className="relative text-[11px] text-violet-200/70">
            © {new Date().getFullYear()} BBW · Alle Rechte vorbehalten
          </div>
        </div>

        <div className="lg:col-span-3 p-8 sm:p-12 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Zap className="w-6 h-6 text-white" fill="white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">AusbilderHub</h1>
              <p className="text-xs text-gray-400">v2.4 · prod</p>
            </div>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Anmelden</h1>
            <p className="text-sm text-gray-500 mt-1">Mit deinem Ausbilder-Konto fortfahren.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-benutzername" className="block text-sm font-medium text-gray-700 mb-1.5">Benutzername</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                <input
                  id="login-benutzername"
                  type="text"
                  value={benutzername}
                  onChange={(e) => setBenutzername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  placeholder="Dein Benutzername"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-passwort" className="block text-sm font-medium text-gray-700 mb-1.5">Passwort</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                <input
                  id="login-passwort"
                  type="password"
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  placeholder="Dein Passwort"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {fehler && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                <span className="w-1 h-1 rounded-full bg-red-500 mt-2 shrink-0" />
                <span>{fehler}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={lade}
              className="group w-full py-3 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl font-medium hover:from-violet-600 hover:to-violet-700 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
            >
              {lade ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Anmelden...
                </>
              ) : (
                <>
                  Anmelden
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
            Probleme beim Anmelden? Wende dich an deinen Administrator.
          </div>
        </div>
      </div>
    </div>
  );
}
