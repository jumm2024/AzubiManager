import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { termineApi, teilnehmerApi } from '../api/client';

interface Termin {
  id: number;
  titel: string;
  beschreibung?: string;
  datum: string;
  endzeit?: string;
  kategorie: string;
  ort?: string;
  azubiId?: number;
  azubiName?: string;
}

export default function TermineListe() {
  const [filter, setFilter] = useState<'anstehend' | 'vergangen' | 'alle'>('anstehend');
  const [titel, setTitel] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [datum, setDatum] = useState('');
  const [endzeit, setEndzeit] = useState('');
  const [kategorie, setKategorie] = useState('Sonstiges');
  const [ort, setOrt] = useState('');
  const [azubiId, setAzubiId] = useState<number | null>(null);
  const [fehler, setFehler] = useState('');
  const queryClient = useQueryClient();
  const { ladeBadges } = useOutletContext<{ ladeBadges: () => void }>();

  const { data, isLoading } = useQuery<Termin[]>({
    queryKey: ['termine', filter],
    queryFn: () => termineApi.alle().then(res => {
      const alle: Termin[] = res.data;
      if (filter === 'anstehend') return alle.filter(t => new Date(t.datum) >= new Date());
      if (filter === 'vergangen') return alle.filter(t => new Date(t.datum) < new Date());
      return alle;
    })
  });

  const { data: teilnehmer } = useQuery({
    queryKey: ['teilnehmer'],
    queryFn: () => teilnehmerApi.alle().then(res => res.data),
  });

  const erstelleMutation = useMutation({
    mutationFn: (d: any) => termineApi.erstellen(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termine'] });
      ladeBadges();
      setTitel('');
      setBeschreibung('');
      setDatum('');
      setEndzeit('');
      setKategorie('Sonstiges');
      setOrt('');
      setAzubiId(null);
    },
    onError: (error: any) => {
      const d = error.response?.data;
      if (typeof d === 'string') setFehler(d);
      else if (d?.title) setFehler(d.title);
      else setFehler('Fehler beim Erstellen');
    }
  });

  const loescheMutation = useMutation({
    mutationFn: (id: number) => termineApi.loeschen(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['termine'] }); ladeBadges(); },
  });

  const handleErstellen = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!titel.trim()) { setFehler('Titel ist erforderlich'); return; }
    if (titel.trim().length < 3) { setFehler('Titel muss mindestens 3 Zeichen haben'); return; }
    if (!datum) { setFehler('Startzeit ist erforderlich'); return; }
    erstelleMutation.mutate({
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || undefined,
      datum: new Date(datum).toISOString(),
      endzeit: endzeit ? new Date(endzeit).toISOString() : undefined,
      kategorie,
      ort: ort.trim() || undefined,
      azubiId: azubiId || undefined,
    });
  };

  const anstehend = data?.filter(t => new Date(t.datum) >= new Date()).length || 0;
  const vergangen = data?.filter(t => new Date(t.datum) < new Date()).length || 0;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-500">Lade Termine...</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Termine</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Gesamt</p>
              <p className="text-2xl font-bold">{data?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <p className="text-sm text-gray-500">Anstehend</p>
              <p className="text-2xl font-bold">{anstehend}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Vergangen</p>
              <p className="text-2xl font-bold">{vergangen}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(['anstehend', 'vergangen', 'alle'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {f === 'anstehend' ? 'Anstehend' : f === 'vergangen' ? 'Vergangen' : 'Alle'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Neuen Termin erstellen</h3>
          <form onSubmit={handleErstellen} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Titel" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startzeit *</label>
                <input type="datetime-local" value={datum} onChange={(e) => setDatum(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endzeit</label>
                <input type="datetime-local" value={endzeit} onChange={(e) => setEndzeit(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                <input type="text" value={ort} onChange={(e) => setOrt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="z.B. Raum 101" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer zuweisen</label>
                <select value={azubiId || ''} onChange={(e) => setAzubiId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Ausbilder</option>
                  {teilnehmer?.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.vorname} {t.nachname}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Beschreibung (optional)" />
              </div>
            </div>

            {fehler && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{fehler}</div>
            )}

            <button type="submit" disabled={erstelleMutation.isPending}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {erstelleMutation.isPending ? 'Wird erstellt...' : 'Termin erstellen'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Alle Termine ({data?.length || 0})</h3>
          <div className="space-y-2">
            {data?.map((t: Termin) => (
              <div key={t.id} className="p-4 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h4 className="font-medium text-gray-800">{t.titel}</h4>
                  <button onClick={() => { if (confirm('Termin loeschen?')) loescheMutation.mutate(t.id); }}
                    className="text-red-400 hover:text-red-600 shrink-0 text-xs">Loeschen</button>
                </div>
                {t.beschreibung && <p className="text-xs text-gray-500 mb-2">{t.beschreibung}</p>}
                <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                  <span>{new Date(t.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  {t.endzeit && <span>- {new Date(t.endzeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>}
                  {t.ort && <span>📍 {t.ort}</span>}
                  {t.azubiName && <span className="bg-gray-100 px-2 py-0.5 rounded">{t.azubiName}</span>}
                </div>
              </div>
            ))}
            {(!data || data.length === 0) && (
              <p className="text-gray-400 text-center py-8 text-sm">Keine Termine vorhanden</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
