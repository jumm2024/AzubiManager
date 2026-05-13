import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notizenApi, teilnehmerApi } from '../api/client';

interface Notiz {
  id: number;
  titel: string;
  inhalt: string;
  kategorie: string;
  azubiId?: number;
  azubiName?: string;
  erstelltAm: string;
}

const kategorien = ['Beobachtung', 'Plan', 'Hinweis', 'Idee', 'Frage', 'Sonstiges'];
  const kategorieFarben: Record<string, string> = {
  Beobachtung: 'bg-blue-100 text-blue-700',
  Plan: 'bg-green-100 text-green-700',
  Hinweis: 'bg-amber-100 text-amber-700',
  Idee: 'bg-purple-100 text-purple-700',
  Frage: 'bg-pink-100 text-pink-700',
  Sonstiges: 'bg-gray-100 text-gray-700',
};

const kategoriePunkte: Record<string, string> = {
  Beobachtung: 'bg-blue-500',
  Plan: 'bg-green-500',
  Hinweis: 'bg-amber-500',
  Idee: 'bg-purple-500',
  Frage: 'bg-pink-500',
  Sonstiges: 'bg-gray-500',
};

export default function NotizenListe() {
  const [titel, setTitel] = useState('');
  const [inhalt, setInhalt] = useState('');
  const [kategorie, setKategorie] = useState('Beobachtung');
  const [azubiIds, setAzubiIds] = useState<number[]>([]);
  const [fehler, setFehler] = useState('');
  const queryClient = useQueryClient();
  const { ladeBadges } = useOutletContext<{ ladeBadges: () => void }>();

  const { data, isLoading } = useQuery<Notiz[]>({
    queryKey: ['notizen'],
    queryFn: () => notizenApi.alle().then(res => res.data)
  });

  const { data: teilnehmer } = useQuery({
    queryKey: ['teilnehmer'],
    queryFn: () => teilnehmerApi.alle().then(res => res.data),
  });

  const erstelleMutation = useMutation({
    mutationFn: (d: any) => notizenApi.erstellen(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notizen'] });
      ladeBadges();
      setTitel('');
      setInhalt('');
      setKategorie('Beobachtung');
      setAzubiIds([]);
    },
    onError: (error: any) => {
      const d = error.response?.data;
      if (typeof d === 'string') setFehler(d);
      else if (d?.title) setFehler(d.title);
      else setFehler('Fehler beim Erstellen');
    }
  });

  const loescheMutation = useMutation({
    mutationFn: (id: number) => notizenApi.loeschen(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notizen'] }); ladeBadges(); },
  });

  const handleErstellen = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!titel.trim()) { setFehler('Titel ist erforderlich'); return; }
    if (titel.trim().length < 3) { setFehler('Titel muss mindestens 3 Zeichen haben'); return; }
    if (!inhalt.trim()) { setFehler('Inhalt ist erforderlich'); return; }
    if (inhalt.trim().length < 10) { setFehler('Inhalt muss mindestens 10 Zeichen haben'); return; }
    erstelleMutation.mutate({
      titel: titel.trim(),
      inhalt: inhalt.trim(),
      kategorie,
      azubiIds: azubiIds.length > 0 ? azubiIds.join(',') : undefined,
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-500">Lade Notizen...</span>
    </div>
  );

  const kategorieCounts = data
    ? kategorien.map(k => ({ kategorie: k, count: data.filter(n => n.kategorie === k).length }))
    : [];

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Information</h2>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {kategorieCounts.map(({ kategorie: k, count }) => (
          <div key={k} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${kategoriePunkte[k] || 'bg-gray-400'}`} />
              <div>
                <p className="text-sm text-gray-500">{k}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Neue Notiz erstellen</h3>
          <form onSubmit={handleErstellen} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Titel" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select value={kategorie} onChange={(e) => setKategorie(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {kategorien.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt *</label>
              <textarea value={inhalt} onChange={(e) => setInhalt(e.target.value)} rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Notizinhalt..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-xl p-2 space-y-1">
                {teilnehmer?.map((t: any) => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={azubiIds.includes(t.id)}
                      onChange={(e) => setAzubiIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                      className="w-4 h-4 rounded accent-blue-600" />
                    {t.vorname} {t.nachname}
                  </label>
                ))}
                {(!teilnehmer || teilnehmer.length === 0) && <p className="text-xs text-gray-400 px-2">Keine Teilnehmer</p>}
              </div>
            </div>

            {fehler && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{fehler}</div>
            )}

            <button type="submit" disabled={erstelleMutation.isPending}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {erstelleMutation.isPending ? 'Wird erstellt...' : 'Notiz erstellen'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Alle Notizen ({data?.length || 0})</h3>
          <div className="space-y-2">
            {data?.map((n: Notiz) => (
              <div key={n.id} className="p-4 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-medium text-gray-800">{n.titel}</h4>
                  <button
                    onClick={() => { if (confirm('Notiz loeschen?')) loescheMutation.mutate(n.id); }}
                    className="text-red-400 hover:text-red-600 shrink-0 text-xs">
                    Loeschen
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap line-clamp-3">{n.inhalt}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${kategorieFarben[n.kategorie] || 'bg-gray-100 text-gray-600'}`}>
                    {n.kategorie}
                  </span>
                  {n.azubiName && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{n.azubiName}</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(n.erstelltAm).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>
            ))}
            {(!data || data.length === 0) && (
              <p className="text-gray-400 text-center py-8 text-sm">Keine Notizen vorhanden</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
