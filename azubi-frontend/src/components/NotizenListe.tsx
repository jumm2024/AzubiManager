import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notizenApi, teilnehmerApi } from '../api/client';
import type { Teilnehmer } from '../api/client';
import Pagination from './Pagination';

interface Notiz {
  id: number;
  titel: string;
  inhalt: string;
  kategorie: string;
  azubiId?: number;
  azubiName?: string;
  ausbilderName?: string;
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
  const [bearbeitenNotiz, setBearbeitenNotiz] = useState<Notiz | null>(null);
  const [bearbeitenTitel, setBearbeitenTitel] = useState('');
  const [bearbeitenInhalt, setBearbeitenInhalt] = useState('');
  const [bearbeitenKategorie, setBearbeitenKategorie] = useState('Beobachtung');
  const [bearbeitenAzubiIds, setBearbeitenAzubiIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: allData } = useQuery({
    queryKey: ['notizen', 'all'],
    queryFn: () => notizenApi.alle(0, 200).then(res => res.data.items)
  });

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ['notizen', currentPage, pageSize],
    queryFn: () => notizenApi.alle((currentPage - 1) * pageSize, pageSize).then(res => res.data)
  });

  const paginatedData = pageData?.items ?? [];
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); }, [currentPage, totalPages]);

  const { data: teilnehmer } = useQuery({
    queryKey: ['teilnehmer'],
    queryFn: () => teilnehmerApi.alle().then(res => {
      const all: Teilnehmer[] = res.data.items;
      return all.filter(t => t.istBetreut);
    }),
  });

  const erstelleMutation = useMutation({
    mutationFn: (d: { titel: string; inhalt: string; kategorie: string; azubiIds?: string }) => notizenApi.erstellen(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notizen'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setTitel('');
      setInhalt('');
      setKategorie('Beobachtung');
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
    mutationFn: (id: number) => notizenApi.loeschen(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notizen'] }); queryClient.invalidateQueries({ queryKey: ['badges'] }); },
  });

  const aktualisierenMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { titel: string; inhalt: string; kategorie: string; azubiIds?: string } }) => notizenApi.aktualisieren(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notizen'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setBearbeitenNotiz(null);
    },
    onError: (error: { response?: { data?: string | { title?: string } } }) => {
      const d = error.response?.data;
      if (typeof d === 'string') setFehler(d);
      else if (d?.title) setFehler(d.title);
      else setFehler('Fehler beim Aktualisieren');
    }
  });

  const handleBearbeitenOeffnen = (n: Notiz) => {
    setBearbeitenNotiz(n);
    setBearbeitenTitel(n.titel);
    setBearbeitenInhalt(n.inhalt);
    setBearbeitenKategorie(n.kategorie);
    setBearbeitenAzubiIds(n.azubiIds ? n.azubiIds.split(',').map(Number).filter(n => !isNaN(n)) : (n.azubiId ? [n.azubiId] : []));
    setFehler('');
  };

  const handleAktualisieren = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!bearbeitenNotiz) return;
    if (!bearbeitenTitel.trim()) { setFehler('Titel ist erforderlich'); return; }
    if (!bearbeitenInhalt.trim()) { setFehler('Inhalt ist erforderlich'); return; }
    aktualisierenMutation.mutate({
      id: bearbeitenNotiz.id,
      data: {
        titel: bearbeitenTitel.trim(),
        inhalt: bearbeitenInhalt.trim(),
        kategorie: bearbeitenKategorie,
        azubiIds: bearbeitenAzubiIds.length > 0 ? bearbeitenAzubiIds.join(',') : undefined,
      }
    });
  };

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
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-500">Lade Notizen...</span>
    </div>
  );

  const kategorieCounts = allData
    ? kategorien.map(k => ({ kategorie: k, count: allData.filter(n => n.kategorie === k).length }))
    : [];

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Information</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {kategorieCounts.map(({ kategorie: k, count }) => (
          <div key={k} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${kategoriePunkte[k] || 'bg-gray-400'}`} />
              <div>
                <p className="text-sm text-gray-500">{k}</p>
                  <p className="text-lg md:text-2xl font-bold">{count}</p>
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
              <label htmlFor="notiz-titel" className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input id="notiz-titel" name="titel" type="text" value={titel} onChange={(e) => setTitel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Titel" required />
            </div>
            <div>
              <label htmlFor="notiz-kategorie" className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select id="notiz-kategorie" name="kategorie" value={kategorie} onChange={(e) => setKategorie(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {kategorien.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="notiz-inhalt" className="block text-sm font-medium text-gray-700 mb-1">Inhalt *</label>
              <textarea id="notiz-inhalt" name="inhalt" value={inhalt} onChange={(e) => setInhalt(e.target.value)} rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Notizinhalt..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-xl p-2 space-y-1">
                {teilnehmer?.map((t: Teilnehmer) => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="checkbox" name={`azubi-${t.id}`} checked={azubiIds.includes(t.id)}
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">Alle Notizen</h3>
            <span className="text-xs text-gray-400">{totalCount} Einträge</span>
          </div>
          <div className="p-3 space-y-2">
            {paginatedData?.map((n: Notiz) => {
              const katFarbe = kategorieFarben[n.kategorie] || 'bg-gray-100 text-gray-600';
              const accentColor = kategoriePunkte[n.kategorie] || 'bg-gray-400';
              return (
                <div key={n.id} className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all">
                  <div className={`w-1 self-stretch rounded-full shrink-0 mt-0.5 ${accentColor.replace('bg-', 'bg-').replace('500', '400')}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-gray-800 text-sm">{n.titel}</h4>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleBearbeitenOeffnen(n)}
                          className="text-xs text-blue-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">Bearbeiten</button>
                        <button onClick={() => { if (confirm('Notiz loeschen?')) loescheMutation.mutate(n.id); }}
                          className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">Löschen</button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{n.inhalt}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${katFarbe}`}>
                        {n.kategorie}
                      </span>
                      {n.azubiName && (
                        <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{n.azubiName}</span>
                      )}
                      {n.ausbilderName && (
                        <span className="text-[10px] text-gray-400">von {n.ausbilderName}</span>
                      )}
                      <span className="text-[11px] text-gray-400 ml-auto">
                        {new Date(n.erstelltAm).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {(paginatedData.length === 0) && (
              <p className="text-gray-400 text-center py-10 text-sm">Keine Notizen vorhanden</p>
            )}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} pageSize={pageSize} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
          </div>
        </div>
      </div>
      {bearbeitenNotiz && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Notiz bearbeiten</h3>
              <button onClick={() => setBearbeitenNotiz(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleAktualisieren} className="space-y-4">
              <div>
                <label htmlFor="edit-notiz-titel" className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input id="edit-notiz-titel" name="titel" type="text" value={bearbeitenTitel} onChange={(e) => setBearbeitenTitel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label htmlFor="edit-notiz-kategorie" className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <select id="edit-notiz-kategorie" name="kategorie" value={bearbeitenKategorie} onChange={(e) => setBearbeitenKategorie(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  {kategorien.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="edit-notiz-inhalt" className="block text-sm font-medium text-gray-700 mb-1">Inhalt *</label>
                <textarea id="edit-notiz-inhalt" name="inhalt" value={bearbeitenInhalt} onChange={(e) => setBearbeitenInhalt(e.target.value)} rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-xl p-2 space-y-1">
                  {teilnehmer?.map((t: Teilnehmer) => (
                    <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                      <input type="checkbox" name={`edit-azubi-${t.id}`} checked={bearbeitenAzubiIds.includes(t.id)}
                        onChange={(e) => setBearbeitenAzubiIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
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

              <div className="flex gap-2">
                <button type="submit" disabled={aktualisierenMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {aktualisierenMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                </button>
                <button type="button" onClick={() => setBearbeitenNotiz(null)}
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
