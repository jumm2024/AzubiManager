import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aufgabenApi, teilnehmerApi } from '../api/client';

interface Aufgabe {
  id: number;
  titel: string;
  beschreibung?: string;
  prioritaet: string;
  faelligkeitsdatum: string;
  erledigt: boolean;
  istGlobal?: boolean;
  azubiName?: string;
  azubiId?: number;
}

export default function AufgabenListe() {
  const [filter] = useState<'alle' | 'offen' | 'erledigt'>('alle');
  const [artFilter, setArtFilter] = useState<'alle' | 'eigene' | 'azubi'>('alle');
  const [prioritaetFilter, setPrioritaetFilter] = useState('');
  const [titel, setTitel] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [prioritaet, setPrioritaet] = useState('Mittel');
  const [faelligkeitsdatum, setFaelligkeitsdatum] = useState('');
  const [azubiIds, setAzubiIds] = useState<number[]>([]);
  const [istGlobal, setIstGlobal] = useState(false);
  const [fehler, setFehler] = useState('');
  const [detailAufgabe, setDetailAufgabe] = useState<Aufgabe | null>(null);
  const queryClient = useQueryClient();
  const { ladeBadges } = useOutletContext<{ ladeBadges: () => void }>();

  const { data, isLoading } = useQuery<Aufgabe[]>({
    queryKey: ['aufgaben', filter, prioritaetFilter, artFilter],
    queryFn: () => {
      const erledigtParam = filter === 'erledigt' ? true : filter === 'offen' ? false : undefined;
      return aufgabenApi.alle(erledigtParam).then(res => {
        let result = res.data;
        if (prioritaetFilter) result = result.filter((a: Aufgabe) => a.prioritaet === prioritaetFilter);
        if (artFilter === 'eigene') result = result.filter((a: Aufgabe) => !a.azubiId);
        if (artFilter === 'azubi') result = result.filter((a: Aufgabe) => a.azubiId);
        return result;
      });
    }
  });

  const { data: teilnehmer } = useQuery({
    queryKey: ['teilnehmer'],
    queryFn: () => teilnehmerApi.alle().then(res => res.data),
  });

  const erstelleMutation = useMutation({
    mutationFn: (data: any) => aufgabenApi.erstellen(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      ladeBadges();
      setTitel('');
      setBeschreibung('');
      setPrioritaet('Mittel');
      setFaelligkeitsdatum('');
      setAzubiIds([]);
      setFehler('');
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

  const toggleMutation = useMutation({
    mutationFn: (id: number) => aufgabenApi.toggleErledigt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      try { ladeBadges(); } catch {}
    },
  });

  const loescheMutation = useMutation({
    mutationFn: (id: number) => aufgabenApi.loeschen(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aufgaben'] }); ladeBadges(); },
  });

  const handleErstellen = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!titel.trim()) {
      setFehler('Titel ist erforderlich');
      return;
    }
    if (!faelligkeitsdatum) {
      setFehler('Fälligkeitsdatum ist erforderlich');
      return;
    }
    erstelleMutation.mutate({
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || undefined,
      prioritaet,
      faelligkeitsdatum,
      istGlobal,
      azubiIds: azubiIds.length > 0 ? azubiIds.join(',') : undefined,
    });
  };

  const gesamt = data?.length || 0;
  const offene = data ? data.filter(a => !a.erledigt).length : 0;
  const erledigte = data ? data.filter(a => a.erledigt).length : 0;
  const ueberfaellig = data ? data.filter(a => !a.erledigt && new Date(a.faelligkeitsdatum) < new Date()).length : 0;
  const heuteHeute = new Date();
  const heute = heuteHeute.toISOString().slice(0, 10);
  const heuteFaellig = data ? data.filter(a => !a.erledigt && a.faelligkeitsdatum === heute).length : 0;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-500">Lade Aufgaben...</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Aufgaben</h2>
        <span className="text-sm text-gray-400">{data?.length || 0} Aufgaben</span>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Gesamt', wert: gesamt, color: 'bg-gray-400' },
          { label: 'Offen', wert: offene, color: 'bg-amber-400' },
          { label: 'Überfällig', wert: ueberfaellig, color: 'bg-red-500' },
          { label: 'Heute fällig', wert: heuteFaellig, color: 'bg-blue-500' },
          { label: 'Erledigt', wert: erledigte, color: 'bg-green-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className={`${k.color} w-3 h-3 rounded-full`} />
              <div>
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className="text-2xl font-bold">{k.wert}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['alle', 'eigene', 'azubi'] as const).map(a => (
            <button key={a} onClick={() => setArtFilter(a)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                artFilter === a
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {a === 'alle' ? 'Alle' : a === 'eigene' ? 'Eigene' : 'Teilnehmer'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {['', 'Hoch', 'Mittel', 'Niedrig'].map(p => (
            <button key={p || 'alle'} onClick={() => setPrioritaetFilter(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                prioritaetFilter === p
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {p || 'Alle'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Neue Aufgabe erstellen</h3>
          <form onSubmit={handleErstellen} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Aufgabentitel" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Beschreibung (optional)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
                <select value={prioritaet} onChange={(e) => setPrioritaet(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="Hoch">Hoch</option>
                  <option value="Mittel">Mittel</option>
                  <option value="Niedrig">Niedrig</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fälligkeitsdatum *</label>
                <input type="date" value={faelligkeitsdatum} onChange={(e) => setFaelligkeitsdatum(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer (mehrere wählbar)</label>
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
              <div className="flex items-center gap-2">
                <input type="checkbox" id="istGlobal" checked={istGlobal} onChange={(e) => setIstGlobal(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                <label htmlFor="istGlobal" className="text-sm text-gray-600 cursor-pointer select-none">Für alle Ausbilder sichtbar</label>
              </div>
            </div>

            {fehler && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{fehler}</div>
            )}

            <button type="submit" disabled={erstelleMutation.isPending}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {erstelleMutation.isPending ? 'Wird erstellt...' : 'Aufgabe erstellen'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">Alle Aufgaben</h3>
          </div>
          <div className="px-6 py-2 bg-gray-50/50 flex items-center gap-3 text-xs font-medium text-gray-400 border-b border-gray-100">
            <div className="w-[18px] shrink-0" />
            <div className="w-2 shrink-0" />
            <div className="flex-1">Titel</div>
            <div className="w-20 text-center">Priorität</div>
            <div className="w-24 text-center">Fälligkeit</div>
            {artFilter !== 'eigene' && <div className="w-24 text-center">Teilnehmer</div>}
            <div className="w-8 shrink-0" />
          </div>
          <div className="divide-y divide-gray-50">
            {data?.map((aufgabe: Aufgabe) => (
              <div key={aufgabe.id} onClick={() => setDetailAufgabe(aufgabe)}
                className={`flex items-center gap-3 px-6 py-3.5 transition-all cursor-pointer ${
                  aufgabe.erledigt
                    ? 'opacity-40'
                    : 'hover:bg-gray-50'
                }`}>
                <input
                  type="checkbox"
                  checked={aufgabe.erledigt}
                  onChange={() => toggleMutation.mutate(aufgabe.id)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                />
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  aufgabe.prioritaet === 'Hoch' ? 'bg-red-500' :
                  aufgabe.prioritaet === 'Mittel' ? 'bg-amber-400' : 'bg-green-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm truncate block ${aufgabe.erledigt ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'}`}>
                    {aufgabe.titel}
                  </span>
                  {aufgabe.beschreibung && (
                    <span className="text-xs text-gray-400 truncate block">{aufgabe.beschreibung}</span>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                  aufgabe.prioritaet === 'Hoch' ? 'text-red-600 bg-red-50' :
                  aufgabe.prioritaet === 'Mittel' ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'
                }`}>
                  {aufgabe.prioritaet}
                </span>
                <span className="text-xs text-gray-400 w-24 text-center shrink-0">
                  {new Date(aufgabe.faelligkeitsdatum).toLocaleDateString('de-DE')}
                </span>
                {artFilter !== 'eigene' && (
                  <span className="text-xs text-gray-400 w-24 text-center truncate shrink-0">
                    {aufgabe.azubiName || '—'}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Aufgabe löschen?')) loescheMutation.mutate(aufgabe.id); }}
                  className="text-gray-300 hover:text-red-500 text-xs shrink-0 transition-colors w-8 text-center">
                  ✕
                </button>
              </div>
            ))}
            {data?.length === 0 && (
              <p className="text-gray-400 text-center py-10 text-sm">Keine Aufgaben vorhanden</p>
            )}
          </div>
        </div>
      </div>

      {detailAufgabe && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDetailAufgabe(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{detailAufgabe.titel}</h3>
              <button onClick={() => setDetailAufgabe(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            {detailAufgabe.beschreibung && (
              <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{detailAufgabe.beschreibung}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Priorität</span>
                <p className={`font-medium mt-0.5 ${
                  detailAufgabe.prioritaet === 'Hoch' ? 'text-red-600' :
                  detailAufgabe.prioritaet === 'Mittel' ? 'text-amber-600' : 'text-green-600'
                }`}>{detailAufgabe.prioritaet}</p>
              </div>
              <div>
                <span className="text-gray-400">Fälligkeit</span>
                <p className="font-medium text-gray-700 mt-0.5">{new Date(detailAufgabe.faelligkeitsdatum).toLocaleDateString('de-DE')}</p>
              </div>
              <div>
                <span className="text-gray-400">Status</span>
                <p className={`font-medium mt-0.5 ${detailAufgabe.erledigt ? 'text-green-600' : 'text-amber-600'}`}>
                  {detailAufgabe.erledigt ? 'Erledigt' : 'Offen'}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Zugewiesen an</span>
                <p className="font-medium text-gray-700 mt-0.5">{detailAufgabe.azubiName || 'Niemand'}</p>
              </div>
              <div>
                <span className="text-gray-400">Sichtbar für</span>
                <p className="font-medium text-gray-700 mt-0.5">{detailAufgabe.istGlobal ? 'Alle Ausbilder' : 'Nur mich'}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
              <input type="checkbox" checked={detailAufgabe.erledigt} onChange={() => { toggleMutation.mutate(detailAufgabe.id); setDetailAufgabe(null); }}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer mt-0.5" />
              <label className="text-sm text-gray-600 cursor-pointer select-none" onClick={() => { toggleMutation.mutate(detailAufgabe.id); setDetailAufgabe(null); }}>
                {detailAufgabe.erledigt ? 'Als offen markieren' : 'Als erledigt markieren'}
              </label>
              <button onClick={() => { if (confirm('Aufgabe löschen?')) { loescheMutation.mutate(detailAufgabe.id); setDetailAufgabe(null); } }}
                className="ml-auto text-sm text-red-500 hover:text-red-700 font-medium">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}