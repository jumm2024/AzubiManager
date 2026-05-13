import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          🔷 Teilnehmer Manager
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Benutzername</label>
            <input
              type="text"
              value={benutzername}
              onChange={(e) => setBenutzername(e.target.value)}
              className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Benutzername"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Passwort</label>
            <input
              type="password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Passwort"
              required
            />
          </div>
          {fehler && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{fehler}</div>
          )}
          <button
            type="submit"
            disabled={lade}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {lade ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}