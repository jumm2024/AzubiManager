import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benutzerApi } from '../api/client';
import api from '../api/client';

export default function BenutzerListe() {
  const [neuerBenutzername, setNeuerBenutzername] = useState('');
  const [neuesPasswort, setNeuesPasswort] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [neueRolle, setNeueRolle] = useState('Ausbilder');
  const [fehler, setFehler] = useState('');
  const [erfolg, setErfolg] = useState('');
  const [pwModal, setPwModal] = useState<{ id: number; name: string } | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [altesPw, setAltesPw] = useState('');
  const [neuesEigenesPw, setNeuesEigenesPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: benutzer, isLoading } = useQuery({
    queryKey: ['benutzer'],
    queryFn: () => benutzerApi.alle().then(res => res.data)
  });

  const erstelleMutation = useMutation({
    mutationFn: (data: any) => benutzerApi.erstellen(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benutzer'] });
      setNeuerBenutzername('');
      setNeuesPasswort('');
      setVorname('');
      setNachname('');
      setFehler('');
      setErfolg('Benutzer erfolgreich erstellt');
      setTimeout(() => setErfolg(''), 3000);
    },
    onError: (error: any) => {
      const data = error.response?.data;
      if (typeof data === 'string') {
        setFehler(data);
      } else if (data?.title) {
        setFehler(data.title);
      } else {
        setFehler('Fehler beim Erstellen');
      }
    }
  });

  const loescheMutation = useMutation({
    mutationFn: (id: number) => benutzerApi.loeschen(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['benutzer'] }),
  });

  const pwMutation = useMutation({
    mutationFn: ({ id, passwort }: { id: number; passwort: string }) =>
      benutzerApi.passwortZuruecksetzen(id, passwort),
    onSuccess: () => {
      setPwModal(null);
      setPwValue('');
      setErfolg('Passwort erfolgreich zurueckgesetzt');
      setTimeout(() => setErfolg(''), 3000);
    },
    onError: (error: any) => {
      const data = error.response?.data;
      if (typeof data === 'string') {
        setFehler(data);
      } else if (data?.title) {
        setFehler(data.title);
      } else {
        setFehler('Fehler beim Zuruecksetzen');
      }
    }
  });

  const handlePwAendern = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    if (!altesPw) { setPwMsg('Altes Passwort eingeben'); return; }
    if (neuesEigenesPw.length < 6) { setPwMsg('Neues Passwort mindestens 6 Zeichen'); return; }
    setPwLoading(true);
    try {
      await api.post('/auth/passwort-aendern', { altesPasswort: altesPw, neuesPasswort: neuesEigenesPw });
      setPwMsg('Passwort geändert!');
      setAltesPw(''); setNeuesEigenesPw('');
    } catch { setPwMsg('Altes Passwort ist falsch'); }
    finally { setPwLoading(false); }
  };

  const handleErstellen = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!neuerBenutzername.trim()) {
      setFehler('Benutzername ist erforderlich');
      return;
    }
    if (neuerBenutzername.trim().length < 3) {
      setFehler('Benutzername muss mindestens 3 Zeichen haben');
      return;
    }
    if (!neuesPasswort) {
      setFehler('Passwort ist erforderlich');
      return;
    }
    if (neuesPasswort.length < 6) {
      setFehler('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    erstelleMutation.mutate({
      benutzername: neuerBenutzername,
      passwort: neuesPasswort,
      vorname,
      nachname,
      rolle: neueRolle
    });
  };

  const adminCount = benutzer?.filter((u: any) => u.rolle === 'Admin').length || 0;
  const ausbilderCount = benutzer?.filter((u: any) => u.rolle === 'Ausbilder').length || 0;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-500">Lade Benutzer...</span>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Benutzer-Verwaltung</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Gesamt</p>
              <p className="text-2xl font-bold">{benutzer?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <div>
              <p className="text-sm text-gray-500">Admin</p>
              <p className="text-2xl font-bold">{adminCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Ausbilder</p>
              <p className="text-2xl font-bold">{ausbilderCount}</p>
            </div>
          </div>
        </div>
      </div>

      {erfolg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {erfolg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Neuen Benutzer anlegen</h3>
          <form onSubmit={handleErstellen} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input
                  type="text"
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Vorname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input
                  type="text"
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nachname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benutzername *</label>
                <input
                  type="text"
                  value={neuerBenutzername}
                  onChange={(e) => setNeuerBenutzername(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Benutzername"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passwort *</label>
                <input
                  type="password"
                  value={neuesPasswort}
                  onChange={(e) => setNeuesPasswort(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Passwort"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                <select
                  value={neueRolle}
                  onChange={(e) => setNeueRolle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="Ausbilder">Ausbilder</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            {fehler && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {fehler}
              </div>
            )}

            <button
              type="submit"
              disabled={erstelleMutation.isPending}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {erstelleMutation.isPending ? 'Wird erstellt...' : 'Benutzer erstellen'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Eigenes Passwort ändern</h3>
          <form onSubmit={handlePwAendern} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Altes Passwort</label>
              <input type="password" value={altesPw} onChange={(e) => setAltesPw(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Altes Passwort" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
              <input type="password" value={neuesEigenesPw} onChange={(e) => setNeuesEigenesPw(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Neues Passwort (min. 6 Zeichen)" required />
            </div>
            {pwMsg && (
              <div className={`px-4 py-2.5 rounded-lg text-sm ${pwMsg === 'Passwort geändert!' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {pwMsg}
              </div>
            )}
            <button type="submit" disabled={pwLoading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              Passwort ändern
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Alle Benutzer ({benutzer?.length || 0})</h3>
          <div className="space-y-2">
            {benutzer?.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold shrink-0">
                    {u.vorname?.[0] || u.benutzername[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{u.vorname || u.benutzername} {u.nachname || ''}</p>
                    <p className="text-sm text-gray-400">@{u.benutzername}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    u.rolle === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.rolle}
                  </span>
                  <button
                    onClick={() => { setPwModal({ id: u.id, name: u.benutzername }); setPwValue(''); }}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
                    title="Passwort zuruecksetzen"
                  >
                    Passwort
                  </button>
                  <button
                    onClick={() => { if (confirm('Benutzer wirklich loeschen?')) loescheMutation.mutate(u.id); }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Loeschen
                  </button>
                </div>
              </div>
            ))}
            {benutzer?.length === 0 && (
              <p className="text-gray-400 text-center py-8">Keine Benutzer vorhanden</p>
            )}
          </div>
        </div>
      </div>

      {pwModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Passwort zuruecksetzen</h3>
            <p className="text-sm text-gray-500 mb-4">Benutzer: <strong>{pwModal.name}</strong></p>
            <input
              type="password"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-1"
              placeholder="Neues Passwort (min. 6 Zeichen)"
              autoFocus
            />
            {fehler && pwModal && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{fehler}</div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setPwModal(null); setFehler(''); }}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  if (!pwValue || pwValue.length < 6) {
                    setFehler('Passwort muss mindestens 6 Zeichen haben');
                    return;
                  }
                  setFehler('');
                  pwMutation.mutate({ id: pwModal.id, passwort: pwValue });
                }}
                disabled={pwMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {pwMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
