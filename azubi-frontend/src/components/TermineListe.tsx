import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { termineApi, teilnehmerApi } from '../api/client';
import type { Teilnehmer } from '../api/client';

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
  ausbilderName?: string;
}

export default function TermineListe() {
  const [filter, setFilter] = useState<'anstehend' | 'vergangen' | 'alle'>('anstehend');
  const [titel, setTitel] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [datum, setDatum] = useState('');
  const [endzeit, setEndzeit] = useState('');
  const [kategorie, setKategorie] = useState('Sonstiges');
  const [ort, setOrt] = useState('');
  const [azubiIds, setAzubiIds] = useState<number[]>([]);
  const [fehler, setFehler] = useState('');
  const [bearbeitenTermin, setBearbeitenTermin] = useState<Termin | null>(null);
  const [bearbeitenTitel, setBearbeitenTitel] = useState('');
  const [bearbeitenBeschreibung, setBearbeitenBeschreibung] = useState('');
  const [bearbeitenDatum, setBearbeitenDatum] = useState('');
  const [bearbeitenEndzeit, setBearbeitenEndzeit] = useState('');
  const [bearbeitenKategorie, setBearbeitenKategorie] = useState('Sonstiges');
  const [bearbeitenOrt, setBearbeitenOrt] = useState('');
  const [bearbeitenAzubiIds, setBearbeitenAzubiIds] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { ladeBadges } = useOutletContext<{ ladeBadges: () => void }>();

  const { data, isLoading } = useQuery<Termin[]>({
    queryKey: ['termine', filter],
    queryFn: () => termineApi.alle().then(res => {
      const alle: Termin[] = res.data;
      if (filter === 'anstehend') return alle.filter(t => new Date(t.datum) >= new Date(new Date().toDateString()));
      if (filter === 'vergangen') return alle.filter(t => new Date(t.datum) < new Date(new Date().toDateString()));
      return alle;
    })
  });

  const { data: teilnehmer } = useQuery({
    queryKey: ['teilnehmer'],
    queryFn: () => teilnehmerApi.alle().then(res => {
      const all = res.data as Teilnehmer[];
      return all.filter(t => t.istBetreut);
    }),
  });
  const betreuteIds = new Set(teilnehmer?.map(t => t.id) ?? []);
  const myData = data?.filter(t => t.azubiId && betreuteIds.has(t.azubiId));

  const erstelleMutation = useMutation({
    mutationFn: (d: { titel: string; beschreibung?: string; datum: string; endzeit?: string; kategorie: string; ort?: string; azubiIds?: string }) => termineApi.erstellen(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termine'] });
      ladeBadges();
      setTitel('');
      setBeschreibung('');
      setDatum('');
      setEndzeit('');
      setKategorie('Sonstiges');
      setOrt('');
      setAzubiIds([]);
    },
    onError: (error: { response?: { data?: string | { title?: string } } }) => {
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

  const aktualisierenMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { titel: string; beschreibung?: string; datum: string; endzeit?: string; kategorie: string; ort?: string; azubiIds?: string } }) => termineApi.aktualisieren(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termine'] });
      ladeBadges();
      setBearbeitenTermin(null);
    },
    onError: (error: { response?: { data?: string | { title?: string } } }) => {
      const d = error.response?.data;
      if (typeof d === 'string') setFehler(d);
      else if (d?.title) setFehler(d.title);
      else setFehler('Fehler beim Aktualisieren');
    }
  });

  const handleBearbeitenOeffnen = (t: Termin) => {
    setBearbeitenTermin(t);
    setBearbeitenTitel(t.titel);
    setBearbeitenBeschreibung(t.beschreibung || '');
    setBearbeitenDatum(t.datum.slice(0, 16));
    setBearbeitenEndzeit(t.endzeit ? t.endzeit.slice(0, 16) : '');
    setBearbeitenKategorie(t.kategorie);
    setBearbeitenOrt(t.ort || '');
    setBearbeitenAzubiIds(t.azubiId ? [t.azubiId] : []);
    setFehler('');
  };

  const handleAktualisieren = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!bearbeitenTermin) return;
    if (!bearbeitenTitel.trim()) { setFehler('Titel ist erforderlich'); return; }
    if (!bearbeitenDatum) { setFehler('Startzeit ist erforderlich'); return; }
    aktualisierenMutation.mutate({
      id: bearbeitenTermin.id,
      data: {
        titel: bearbeitenTitel.trim(),
        beschreibung: bearbeitenBeschreibung.trim() || undefined,
        datum: bearbeitenDatum,
        endzeit: bearbeitenEndzeit || undefined,
        kategorie: bearbeitenKategorie,
        ort: bearbeitenOrt.trim() || undefined,
        azubiIds: bearbeitenAzubiIds.length > 0 ? bearbeitenAzubiIds.join(',') : undefined,
      }
    });
  };

  const handleErstellen = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!titel.trim()) { setFehler('Titel ist erforderlich'); return; }
    if (titel.trim().length < 3) { setFehler('Titel muss mindestens 3 Zeichen haben'); return; }
    if (!datum) { setFehler('Startzeit ist erforderlich'); return; }
    erstelleMutation.mutate({
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || undefined,
      datum: datum,
      endzeit: endzeit || undefined,
      kategorie,
      ort: ort.trim() || undefined,
      azubiIds: azubiIds.length > 0 ? azubiIds.join(',') : undefined,
    });
  };

  const anstehend = myData?.filter(t => new Date(t.datum) >= new Date()).length || 0;
  const vergangen = myData?.filter(t => new Date(t.datum) < new Date()).length || 0;

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
              <p className="text-2xl font-bold">{myData?.length || 0}</p>
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
                <label htmlFor="termin-titel" className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input id="termin-titel" name="titel" type="text" value={titel} onChange={(e) => setTitel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Titel" required />
              </div>
              <div>
                <label htmlFor="termin-start" className="block text-sm font-medium text-gray-700 mb-1">Startzeit *</label>
                <input id="termin-start" name="datum" type="datetime-local" value={datum} onChange={(e) => setDatum(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label htmlFor="termin-endzeit" className="block text-sm font-medium text-gray-700 mb-1">Endzeit</label>
                <input id="termin-endzeit" name="endzeit" type="datetime-local" value={endzeit} onChange={(e) => setEndzeit(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label htmlFor="termin-ort" className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                <input id="termin-ort" name="ort" type="text" value={ort} onChange={(e) => setOrt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="z.B. Raum 101" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-xl p-2 space-y-1">
                  {teilnehmer?.map((t: Teilnehmer) => (
                    <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                      <input type="checkbox" name={`termin-azubi-${t.id}`} checked={azubiIds.includes(t.id)}
                        onChange={(e) => setAzubiIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                        className="w-4 h-4 rounded accent-blue-600" />
                      {t.vorname} {t.nachname}
                    </label>
                  ))}
                  {(!teilnehmer || teilnehmer.length === 0) && <p className="text-xs text-gray-400 px-2">Keine Teilnehmer</p>}
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="termin-beschreibung" className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea id="termin-beschreibung" name="beschreibung" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={3}
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">Alle Termine</h3>
            <span className="text-xs text-gray-400">{myData?.length || 0} Einträge</span>
          </div>
          <div className="p-3 space-y-2">
            {myData?.map((t: Termin) => (
              <div key={t.id} className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all">
                <div className="flex flex-col items-center gap-1 w-12 shrink-0">
                  <span className="text-xs font-bold text-gray-400 uppercase">
                    {new Date(t.datum).toLocaleDateString('de-DE', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-gray-800 leading-none">
                    {new Date(t.datum).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-gray-800 text-sm">{t.titel}</h4>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleBearbeitenOeffnen(t)}
                        className="text-xs text-blue-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">Bearbeiten</button>
                      <button onClick={() => { if (confirm('Termin loeschen?')) loescheMutation.mutate(t.id); }}
                        className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">Löschen</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {new Date(t.datum).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {t.endzeit && (
                      <span className="text-[11px] text-gray-400">– {new Date(t.endzeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    {t.ort && (
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{t.ort}</span>
                    )}
                    {t.azubiName && (
                      <span className="text-[11px] text-gray-500 bg-indigo-50 px-2 py-0.5 rounded">{t.azubiName}</span>
                    )}
                    {t.ausbilderName && (
                      <span className="text-[10px] text-gray-400">von {t.ausbilderName}</span>
                    )}
                  </div>
                  {t.beschreibung && (
                    <p className="text-[11px] text-gray-400 mt-1.5 truncate">{t.beschreibung}</p>
                  )}
                </div>
              </div>
            ))}
            {(!data || data.length === 0) && (
              <p className="text-gray-400 text-center py-10 text-sm">Keine Termine vorhanden</p>
            )}
          </div>
        </div>
      </div>
      {bearbeitenTermin && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setBearbeitenTermin(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Termin bearbeiten</h3>
              <button onClick={() => setBearbeitenTermin(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleAktualisieren} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label htmlFor="edit-termin-titel" className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                  <input id="edit-termin-titel" name="titel" type="text" value={bearbeitenTitel} onChange={(e) => setBearbeitenTitel(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label htmlFor="edit-termin-start" className="block text-sm font-medium text-gray-700 mb-1">Startzeit *</label>
                  <input id="edit-termin-start" name="datum" type="datetime-local" value={bearbeitenDatum} onChange={(e) => setBearbeitenDatum(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label htmlFor="edit-termin-endzeit" className="block text-sm font-medium text-gray-700 mb-1">Endzeit</label>
                  <input id="edit-termin-endzeit" name="endzeit" type="datetime-local" value={bearbeitenEndzeit} onChange={(e) => setBearbeitenEndzeit(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label htmlFor="edit-termin-ort" className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                  <input id="edit-termin-ort" name="ort" type="text" value={bearbeitenOrt} onChange={(e) => setBearbeitenOrt(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="z.B. Raum 101" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer</label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-xl p-2 space-y-1">
                    {teilnehmer?.map((t: Teilnehmer) => (
                      <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                        <input type="checkbox" name={`edit-termin-azubi-${t.id}`} checked={bearbeitenAzubiIds.includes(t.id)}
                          onChange={(e) => setBearbeitenAzubiIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                          className="w-4 h-4 rounded accent-blue-600" />
                        {t.vorname} {t.nachname}
                      </label>
                    ))}
                    {(!teilnehmer || teilnehmer.length === 0) && <p className="text-xs text-gray-400 px-2">Keine Teilnehmer</p>}
                  </div>
                </div>
                <div className="col-span-2">
                  <label htmlFor="edit-termin-beschreibung" className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <textarea id="edit-termin-beschreibung" name="beschreibung" value={bearbeitenBeschreibung} onChange={(e) => setBearbeitenBeschreibung(e.target.value)} rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Beschreibung (optional)" />
                </div>
              </div>

              {fehler && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{fehler}</div>
              )}

              <div className="flex gap-2">
                <button type="submit" disabled={aktualisierenMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {aktualisierenMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                </button>
                <button type="button" onClick={() => setBearbeitenTermin(null)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
