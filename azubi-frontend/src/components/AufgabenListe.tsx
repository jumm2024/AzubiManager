import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aufgabenApi, teilnehmerApi } from '../api/client';
import type { Teilnehmer } from '../api/client';
import Pagination from './Pagination';
import { updateBadges, refetchBadges } from '../stores/badgesStore';

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
  ausbilderName?: string;
  erledigtVonName?: string;
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
  const [fehler, setFehler] = useState('');
  const [optimisticDone, setOptimisticDone] = useState<Record<number, boolean>>({});
  const [detailAufgabe, setDetailAufgabe] = useState<Aufgabe | null>(null);
  const [bearbeitenAufgabe, setBearbeitenAufgabe] = useState<Aufgabe | null>(null);
  const [bearbeitenTitel, setBearbeitenTitel] = useState('');
  const [bearbeitenBeschreibung, setBearbeitenBeschreibung] = useState('');
  const [bearbeitenPrioritaet, setBearbeitenPrioritaet] = useState('Mittel');
  const [bearbeitenFaelligkeitsdatum, setBearbeitenFaelligkeitsdatum] = useState('');
  const [bearbeitenAzubiIds, setBearbeitenAzubiIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const erledigtParam = filter === 'erledigt' ? true : filter === 'offen' ? false : undefined;

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ['aufgaben', currentPage, pageSize, filter, prioritaetFilter, artFilter],
    queryFn: () => aufgabenApi.alle(erledigtParam, (currentPage - 1) * pageSize, pageSize, prioritaetFilter || undefined, artFilter || undefined).then(res => res.data)
  });

  const { data: allData } = useQuery({
    queryKey: ['aufgaben', 'all', filter, prioritaetFilter, artFilter],
    queryFn: () => aufgabenApi.alle(erledigtParam, 0, 200, prioritaetFilter || undefined, artFilter || undefined).then(res => res.data.items)
  });

  const paginatedData = pageData?.items ?? [];
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  useEffect(() => { if (totalPages > 0 && currentPage > totalPages) setCurrentPage(1); }, [currentPage, totalPages]);

  const heuteHeute = new Date();
  const heute = heuteHeute.toISOString().slice(0, 10);
  const statsData = allData ?? [];
  const gesamt = statsData.length;
  const offene = statsData.filter((a: Aufgabe) => !a.erledigt).length;
  const erledigte = statsData.filter((a: Aufgabe) => a.erledigt).length;
  const ueberfaellig = statsData.filter((a: Aufgabe) => !a.erledigt && new Date(a.faelligkeitsdatum) < new Date()).length;
  const heuteFaellig = statsData.filter((a: Aufgabe) => !a.erledigt && a.faelligkeitsdatum === heute).length;

  const { data: teilnehmer } = useQuery({
    queryKey: ['teilnehmer'],
    queryFn: () => teilnehmerApi.alle().then(res => {
      return res.data.items.filter((t: Teilnehmer) => t.istBetreut);
    }),
  });

  const erstelleMutation = useMutation({
    mutationFn: (data: { titel: string; beschreibung?: string; prioritaet: string; faelligkeitsdatum: string; istGlobal?: boolean; azubiIds?: string }) => aufgabenApi.erstellen(data),
    onMutate: () => {
      updateBadges(prev => ({ ...prev, aufgaben: prev.aufgaben + 1 }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setTitel('');
      setBeschreibung('');
      setPrioritaet('Mittel');
      setFaelligkeitsdatum('');
      setAzubiIds([]);
      setFehler('');
    },
    onError: (error: { response?: { data?: string | { title?: string } } }) => {
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
    onSuccess: (_data, id) => {
      setDetailAufgabe(prev => prev?.id === id ? { ...prev, erledigt: !prev.erledigt } : prev);
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] }).then(() => {
        setOptimisticDone({});
      });
    },
  });

  const loescheMutation = useMutation({
    mutationFn: (id: number) => aufgabenApi.loeschen(id),
    onMutate: () => {
      updateBadges(prev => ({ ...prev, aufgaben: Math.max(0, prev.aufgaben - 1) }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
    },
    onError: (error: { response?: { data?: string | { title?: string } } }) => {
      refetchBadges();
      const data = error.response?.data;
      if (typeof data === 'string') setFehler(data);
      else if (data?.title) setFehler(data.title);
      else setFehler('Fehler beim Löschen');
    },
  });

  const aktualisierenMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { titel: string; beschreibung?: string; prioritaet: string; faelligkeitsdatum: string; istGlobal?: boolean; azubiIds?: string } }) => aufgabenApi.aktualisieren(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setBearbeitenAufgabe(null);
    },
    onError: (error: { response?: { data?: string | { title?: string } } }) => {
      const data = error.response?.data;
      if (typeof data === 'string') {
        setFehler(data);
      } else if (data?.title) {
        setFehler(data.title);
      } else {
        setFehler('Fehler beim Aktualisieren');
      }
    }
  });

  const handleBearbeitenOeffnen = (aufgabe: Aufgabe) => {
    setBearbeitenAufgabe(aufgabe);
    setBearbeitenTitel(aufgabe.titel);
    setBearbeitenBeschreibung(aufgabe.beschreibung || '');
    setBearbeitenPrioritaet(aufgabe.prioritaet);
    setBearbeitenFaelligkeitsdatum(aufgabe.faelligkeitsdatum.slice(0, 10));
    setBearbeitenAzubiIds(aufgabe.azubiIds ? aufgabe.azubiIds.split(',').map(Number).filter(n => !isNaN(n)) : (aufgabe.azubiId ? [aufgabe.azubiId] : []));
    setFehler('');
  };

  const handleAktualisieren = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!bearbeitenAufgabe) return;
    if (!bearbeitenTitel.trim()) {
      setFehler('Titel ist erforderlich');
      return;
    }
    if (!bearbeitenFaelligkeitsdatum) {
      setFehler('Fälligkeitsdatum ist erforderlich');
      return;
    }
    aktualisierenMutation.mutate({
      id: bearbeitenAufgabe.id,
      data: {
        titel: bearbeitenTitel.trim(),
        beschreibung: bearbeitenBeschreibung.trim() || undefined,
        prioritaet: bearbeitenPrioritaet,
        faelligkeitsdatum: bearbeitenFaelligkeitsdatum,
        istGlobal: false,
        azubiIds: bearbeitenAzubiIds.join(','),
      }
    });
  };

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
      istGlobal: false,
      azubiIds: azubiIds.length > 0 ? azubiIds.join(',') : undefined,
    });
  };



  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl font-bold">!</span>
        </div>
        <p className="text-red-700 font-semibold mb-1">Fehler beim Laden</p>
        <p className="text-sm text-red-500">{(error as Error)?.message || 'Bitte Seite neu laden oder später erneut versuchen.'}</p>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-500">Lade Aufgaben...</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Aufgaben</h2>
         <span className="text-sm text-gray-400">{gesamt} Aufgaben</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
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
                  <p className="text-lg md:text-2xl font-bold">{k.wert}</p>
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
                <label htmlFor="aufgabe-titel" className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input id="aufgabe-titel" name="titel" type="text" value={titel} onChange={(e) => setTitel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none"
                  placeholder="Aufgabentitel" required />
              </div>
              <div className="col-span-2">
                <label htmlFor="aufgabe-beschreibung" className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea id="aufgabe-beschreibung" name="beschreibung" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none resize-none"
                  placeholder="Beschreibung (optional)" />
              </div>
              <div>
                <label htmlFor="aufgabe-prioritaet" className="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
                <select id="aufgabe-prioritaet" name="prioritaet" value={prioritaet} onChange={(e) => setPrioritaet(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none bg-white">
                  <option value="Hoch">Hoch</option>
                  <option value="Mittel">Mittel</option>
                  <option value="Niedrig">Niedrig</option>
                </select>
              </div>
              <div>
                <label htmlFor="aufgabe-faelligkeit" className="block text-sm font-medium text-gray-700 mb-1">Fälligkeitsdatum *</label>
                <input id="aufgabe-faelligkeit" name="faelligkeitsdatum" type="date" value={faelligkeitsdatum} onChange={(e) => setFaelligkeitsdatum(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer (mehrere wählbar)</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-xl p-2 space-y-1">
                  {teilnehmer?.map((t: Teilnehmer) => (
                    <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                      <input type="checkbox" name={`aufgabe-azubi-${t.id}`} checked={azubiIds.includes(t.id)}
                        onChange={(e) => setAzubiIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                        className="w-4 h-4 rounded accent-violet-500" />
                      {t.vorname} {t.nachname}
                    </label>
                  ))}
                  {(!teilnehmer || teilnehmer.length === 0) && <p className="text-xs text-gray-400 px-2">Keine Teilnehmer</p>}
                </div>
              </div>
            </div>

            {fehler && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{fehler}</div>
            )}

            <button type="submit" disabled={erstelleMutation.isPending}
              className="w-full py-2.5 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 disabled:opacity-50 transition-colors">
              {erstelleMutation.isPending ? 'Wird erstellt...' : 'Aufgabe erstellen'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">Alle Aufgaben</h3>
            <span className="text-xs text-gray-400">{totalCount} Einträge</span>
          </div>
          <div className="p-3 space-y-2">
            {paginatedData?.map((aufgabe: Aufgabe) => (
              <div key={aufgabe.id} onClick={() => setDetailAufgabe(aufgabe)}
                className={`group flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  aufgabe.erledigt
                    ? 'bg-gray-50/50 border-gray-100 opacity-60'
                    : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5'
                }`}>
                <div className={`w-1 self-stretch rounded-full shrink-0 mt-0.5 ${
                  aufgabe.prioritaet === 'Hoch' ? 'bg-red-400' :
                  aufgabe.prioritaet === 'Mittel' ? 'bg-amber-400' : 'bg-green-400'
                }`} />
                <input type="checkbox" id={`aufgabe-done-${aufgabe.id}`} name={`aufgabe-done-${aufgabe.id}`} checked={aufgabe.id in optimisticDone ? optimisticDone[aufgabe.id] : aufgabe.erledigt}
                  onChange={() => { setOptimisticDone(prev => ({ ...prev, [aufgabe.id]: !(prev[aufgabe.id] ?? aufgabe.erledigt) })); toggleMutation.mutate(aufgabe.id); }}
                  className="w-4 h-4 rounded accent-violet-500 cursor-pointer shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm truncate ${aufgabe.erledigt ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'}`}>
                      {aufgabe.titel}
                    </span>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleBearbeitenOeffnen(aufgabe); }}
                        className="text-xs text-violet-400 hover:text-violet-600 px-1.5 py-0.5 rounded hover:bg-violet-50 transition-colors">✎</button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Aufgabe löschen?')) loescheMutation.mutate(aufgabe.id); }}
                        className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">✕</button>
                    </div>
                  </div>
                  {aufgabe.beschreibung && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{aufgabe.beschreibung}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                      aufgabe.prioritaet === 'Hoch' ? 'text-red-600 bg-red-50' :
                      aufgabe.prioritaet === 'Mittel' ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'
                    }`}>
                      {aufgabe.prioritaet}
                    </span>
                    <span className={`text-[11px] ${
                      !aufgabe.erledigt && new Date(aufgabe.faelligkeitsdatum) < new Date()
                        ? 'text-red-500 font-medium'
                        : 'text-gray-400'
                    }`}>
                      {new Date(aufgabe.faelligkeitsdatum).toLocaleDateString('de-DE')}
                    </span>
                    {aufgabe.azubiName && (
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{aufgabe.azubiName}</span>
                    )}
                    {aufgabe.ausbilderName && (
                      <span className="text-[10px] text-gray-400">von {aufgabe.ausbilderName}</span>
                    )}
                    {aufgabe.erledigt && aufgabe.erledigtVonName && (
                      <span className="text-[10px] text-green-500">erledigt von {aufgabe.erledigtVonName}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {paginatedData.length === 0 && (
              <p className="text-gray-400 text-center py-10 text-sm">Keine Aufgaben vorhanden</p>
            )}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} pageSize={pageSize} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
          </div>
        </div>
      </div>

      {detailAufgabe && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
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
              {detailAufgabe.ausbilderName && (
                <div className="col-span-2">
                  <span className="text-gray-400">Erstellt von</span>
                  <p className="font-medium text-gray-700 mt-0.5">{detailAufgabe.ausbilderName}</p>
                </div>
              )}
              {detailAufgabe.erledigt && detailAufgabe.erledigtVonName && (
                <div className="col-span-2">
                  <span className="text-gray-400">Erledigt von</span>
                  <p className="font-medium text-green-600 mt-0.5">{detailAufgabe.erledigtVonName}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
              <input type="checkbox" id="detail-aufgabe-done" name="detail-aufgabe-done" checked={detailAufgabe.id in optimisticDone ? optimisticDone[detailAufgabe.id] : detailAufgabe.erledigt}
                onChange={() => { setOptimisticDone(prev => ({ ...prev, [detailAufgabe.id]: !(prev[detailAufgabe.id] ?? detailAufgabe.erledigt) })); toggleMutation.mutate(detailAufgabe.id); }}
                className="w-4 h-4 rounded accent-violet-500 cursor-pointer mt-0.5" />
              <label htmlFor="detail-aufgabe-done" className="text-sm text-gray-600 cursor-pointer select-none" onClick={() => { setOptimisticDone(prev => ({ ...prev, [detailAufgabe.id]: !(prev[detailAufgabe.id] ?? detailAufgabe.erledigt) })); toggleMutation.mutate(detailAufgabe.id); }}>
                {detailAufgabe.id in optimisticDone ? (optimisticDone[detailAufgabe.id] ? 'Als offen markieren' : 'Als erledigt markieren') : (detailAufgabe.erledigt ? 'Als offen markieren' : 'Als erledigt markieren')}
              </label>
              <button onClick={() => { handleBearbeitenOeffnen(detailAufgabe); setDetailAufgabe(null); }}
                className="ml-2 text-sm text-violet-500 hover:text-violet-700 font-medium">Bearbeiten</button>
              <button onClick={async () => { if (confirm('Aufgabe löschen?')) { await loescheMutation.mutateAsync(detailAufgabe.id); setDetailAufgabe(null); } }}
                className="ml-auto text-sm text-red-500 hover:text-red-700 font-medium">Löschen</button>
              <button onClick={() => setDetailAufgabe(null)}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium">Schließen</button>
            </div>
          </div>
        </div>
      )}

      {bearbeitenAufgabe && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Aufgabe bearbeiten</h3>
              <button onClick={() => setBearbeitenAufgabe(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleAktualisieren} className="space-y-4">
              <div>
                <label htmlFor="edit-aufgabe-titel" className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input id="edit-aufgabe-titel" name="titel" type="text" value={bearbeitenTitel} onChange={(e) => setBearbeitenTitel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none"
                  placeholder="Aufgabentitel" required />
              </div>
              <div>
                <label htmlFor="edit-aufgabe-beschreibung" className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea id="edit-aufgabe-beschreibung" name="beschreibung" value={bearbeitenBeschreibung} onChange={(e) => setBearbeitenBeschreibung(e.target.value)} rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none resize-none"
                  placeholder="Beschreibung (optional)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-aufgabe-prioritaet" className="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
                  <select id="edit-aufgabe-prioritaet" name="prioritaet" value={bearbeitenPrioritaet} onChange={(e) => setBearbeitenPrioritaet(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none bg-white">
                    <option value="Hoch">Hoch</option>
                    <option value="Mittel">Mittel</option>
                    <option value="Niedrig">Niedrig</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-aufgabe-faelligkeit" className="block text-sm font-medium text-gray-700 mb-1">Fälligkeitsdatum *</label>
                  <input id="edit-aufgabe-faelligkeit" name="faelligkeitsdatum" type="date" value={bearbeitenFaelligkeitsdatum} onChange={(e) => setBearbeitenFaelligkeitsdatum(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer (mehrere wählbar)</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-xl p-2 space-y-1">
                  {teilnehmer?.map((t: Teilnehmer) => (
                    <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                      <input type="checkbox" name={`edit-aufgabe-azubi-${t.id}`} checked={bearbeitenAzubiIds.includes(t.id)}
                        onChange={(e) => setBearbeitenAzubiIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                        className="w-4 h-4 rounded accent-violet-500" />
                      {t.vorname} {t.nachname}
                    </label>
                  ))}
                  {(!teilnehmer || teilnehmer.length === 0) && <p className="text-xs text-gray-400 px-2">Keine Teilnehmer</p>}
                </div>
              </div>
              {fehler && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{fehler}</div>
              )}

              <div className="flex gap-2">
                <button type="submit" disabled={aktualisierenMutation.isPending}
                  className="flex-1 py-2.5 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 disabled:opacity-50 transition-colors">
                  {aktualisierenMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                </button>
                <button type="button" onClick={() => setBearbeitenAufgabe(null)}
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