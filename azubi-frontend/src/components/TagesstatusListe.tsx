import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagesstatusApi, teilnehmerApi } from '../api/client';
import type { Tagesstatus, Teilnehmer } from '../api/client';
import { Upload, Download, FileText, CalendarDays } from 'lucide-react';

const statusListe = ['Anwesend', 'Schule', 'Praktikum', 'Termin', 'Urlaub', 'Krank', 'Kind krank', 'VAmB', 'Freigestellt', 'Entschuldigt', 'Unentschuldigt', 'Ungeklärt', 'Feiertag', 'Wochenende'];

const statusFarben: Record<string, string> = {
  Anwesend: 'bg-green-500',
  Schule: 'bg-blue-500',
  Praktikum: 'bg-purple-500',
  Termin: 'bg-indigo-500',
  Urlaub: 'bg-yellow-500',
  Krank: 'bg-red-400',
  'Kind krank': 'bg-pink-400',
  VAmB: 'bg-cyan-500',
  Freigestellt: 'bg-teal-500',
  Entschuldigt: 'bg-emerald-500',
  Unentschuldigt: 'bg-orange-500',
  'Ungeklärt': 'bg-gray-400',
  Feiertag: 'bg-red-600',
  Wochenende: 'bg-blue-300',
};

const statusBgFarben: Record<string, string> = {
  Anwesend: 'bg-green-50 border-green-200 text-green-700',
  Schule: 'bg-blue-50 border-blue-200 text-blue-700',
  Praktikum: 'bg-purple-50 border-purple-200 text-purple-700',
  Termin: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  Urlaub: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  Krank: 'bg-red-50 border-red-200 text-red-700',
  'Kind krank': 'bg-pink-50 border-pink-200 text-pink-700',
  VAmB: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  Freigestellt: 'bg-teal-50 border-teal-200 text-teal-700',
  Entschuldigt: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Unentschuldigt: 'bg-orange-50 border-orange-200 text-orange-700',
  'Ungeklärt': 'bg-gray-50 border-gray-200 text-gray-700',
  'Feiertag': 'bg-red-50 border-red-600 text-red-700',
  'Wochenende': 'bg-blue-50 border-blue-300 text-blue-700',
};

export default function TagesstatusListe() {
  const heute = new Date().toISOString().slice(0, 10);
  const [datum, setDatum] = useState(heute);
  const [lokaleStatus, setLokaleStatus] = useState<Record<number, string>>({});
  const [importMsg, setImportMsg] = useState('');
  const [importIsError, setImportIsError] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLade, setImportLade] = useState(false);
  const queryClient = useQueryClient();

  const importDatum = new Date(datum);
  const [importMonth, setImportMonth] = useState(importDatum.getMonth() + 1);
  const [importYear, setImportYear] = useState(importDatum.getFullYear());

  const { data: statusData, isLoading, error } = useQuery({
    queryKey: ['tagesstatus', datum],
    queryFn: () => tagesstatusApi.alleFuerDatum(datum).then(res => res.data),
  });

  const { data: alleTeilnehmer } = useQuery({
    queryKey: ['teilnehmer'],
    queryFn: () => teilnehmerApi.alle().then(res => res.data.items),
    select: (alle: Teilnehmer[]) => alle.filter(t => t.istBetreut)
  });

  const setzenMutation = useMutation({
    mutationFn: (d: { azubiId: number; datum: string; status: string; bemerkung?: string }) => tagesstatusApi.setzen(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tagesstatus', datum] }),
  });

  const mergeData = (alleTeilnehmer as Teilnehmer[])?.map((t: Teilnehmer) => {
    const existing = statusData?.find((s: Tagesstatus) => s.azubiId === t.id);
    return { ...t, statusId: existing?.id, status: existing?.status || '', bemerkung: existing?.bemerkung || '' };
  }) || [];

  const statusCounts = statusListe.map(s => ({
    status: s,
    count: mergeData.filter((t: { status: string }) => t.status === s).length,
  }));

  const handleStatusChange = (azubiId: number, neuerStatus: string) => {
    setLokaleStatus(prev => ({ ...prev, [azubiId]: neuerStatus }));
    setzenMutation.mutate({ azubiId, datum, status: neuerStatus });
  };

  const handleImportOeffnen = () => {
    const d = new Date(datum);
    setImportMonth(d.getMonth() + 1);
    setImportYear(d.getFullYear());
    setImportFile(null);
    setImportModal(true);
  };

  const handleImportStart = async () => {
    if (!importFile) return;
    setImportLade(true);
    setImportMsg('');
    setImportIsError(false);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await tagesstatusApi.import(importFile, importYear, importMonth);
      setImportMsg(`${res.data.imported} Einträge importiert`);
      const neuesDatum = `${importYear}-${String(importMonth).padStart(2, '0')}-01`;
      setDatum(neuesDatum);
      queryClient.invalidateQueries({ queryKey: ['tagesstatus', neuesDatum] });
      setImportModal(false);
    } catch {
      setImportMsg('Import fehlgeschlagen');
      setImportIsError(true);
    } finally {
      setImportLade(false);
    }
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
      <span className="ml-3 text-gray-500">Lade Tagesstatus...</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Tagesstatus</h2>
        {importMsg && <span className={`text-sm ${importIsError ? 'text-red-600' : 'text-green-600'}`}>{importMsg}</span>}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button onClick={handleImportOeffnen}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Excel-Datei hochladen (.xlsx/.xls)
            </div>
          </div>
          <div className="relative group">
            <button onClick={async () => {
              try {
                setImportIsError(false);
                setImportMsg('');
                const res = await tagesstatusApi.export(new Date(datum).getFullYear(), new Date(datum).getMonth() + 1);
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a'); a.href = url; a.download = `Tagesstatus_${new Date(datum).getFullYear()}_${String(new Date(datum).getMonth() + 1).padStart(2, '0')}.xlsx`; a.click();
                URL.revokeObjectURL(url);
              } catch {
                setImportIsError(true);
                setImportMsg('Export fehlgeschlagen');
              }
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Tagesstatus-Tabelle für diesen Monat
            </div>
          </div>
          <div className="relative group">
            <button onClick={async () => {
              try {
                setImportIsError(false);
                setImportMsg('');
                const res = await tagesstatusApi.bericht(new Date(datum).getFullYear(), new Date(datum).getMonth() + 1);
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a'); a.href = url; a.download = `AzubiBericht_${new Date(datum).getFullYear()}_${String(new Date(datum).getMonth() + 1).padStart(2, '0')}.xlsx`; a.click();
                URL.revokeObjectURL(url);
              } catch {
                setImportIsError(true);
                setImportMsg('Monatsbericht fehlgeschlagen');
              }
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium">
              <FileText className="w-4 h-4" />
              Monats-Bericht
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Status-Zusammenfassung pro Azubi für diesen Monat
            </div>
          </div>
          <div className="relative group">
            <button onClick={async () => {
              try {
                setImportIsError(false);
                setImportMsg('');
                const res = await tagesstatusApi.berichtGesamt();
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a'); a.href = url; a.download = `AzubiBericht_Gesamt.xlsx`; a.click();
                URL.revokeObjectURL(url);
              } catch {
                setImportIsError(true);
                setImportMsg('Gesamtbericht fehlgeschlagen');
              }
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium">
              <CalendarDays className="w-4 h-4" />
              Gesamt-Bericht
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Status-Zusammenfassung aller Zeiten + Ausbildungszeiträume
            </div>
          </div>
          <input id="tagesstatus-datum" name="datum" type="date" value={datum} onChange={(e) => { setDatum(e.target.value); setLokaleStatus({}); }}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-8">
        {statusCounts.map(({ status: s, count }) => (
          <div key={s} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusFarben[s] || 'bg-gray-400'}`} />
              <div>
                <p className="text-sm text-gray-500">{s}</p>
                <p className="text-lg md:text-2xl font-bold">{count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="divide-y divide-gray-100">
          {mergeData.map((t: { id: number; vorname: string; nachname: string; kurs?: string; gruppe: string; lehrjahr: number; status: string; statusId?: number; bemerkung: string }) => (
            <div key={t.id} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold shrink-0 text-sm">
                {t.vorname?.[0]}{t.nachname?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{t.vorname} {t.nachname}</p>
                <p className="text-xs text-gray-400">{t.kurs || t.gruppe} - Lehrjahr {t.lehrjahr}</p>
              </div>
              <select id={`status-${t.id}`} name={`status-${t.id}`} value={lokaleStatus[t.id] ?? t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border outline-none ${
                  (lokaleStatus[t.id] ?? t.status) ? statusBgFarben[lokaleStatus[t.id] ?? t.status] : 'text-gray-600 bg-white border-gray-200'
                }`}>
                <option value="">Status waehlen</option>
                {statusListe.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => !importLade && setImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Excel-Import</h3>
              <button onClick={() => !importLade && setImportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Warnung */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Wichtig: Monat prüfen!</p>
                  <p>Die Daten werden in den unten gewählten Monat importiert. Bitte stelle sicher, dass der Monat zur Excel-Datei passt.</p>
                  <p className="mt-1 font-medium">Nur Excel-Dateien (.xlsx, .xls) werden akzeptiert.</p>
                </div>
              </div>

              {/* Monatsauswahl */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Import-Monat</label>
                <div className="flex gap-3">
                  <select value={importMonth} onChange={(e) => setImportMonth(parseInt(e.target.value))}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2026, i, 1).toLocaleDateString('de-DE', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <input type="number" value={importYear} onChange={(e) => setImportYear(parseInt(e.target.value))}
                    className="w-24 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    min="2020" max="2030" />
                </div>
              </div>

              {/* Datei-Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Excel-Datei</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden" id="modal-import-file" />
                  <label htmlFor="modal-import-file" className="cursor-pointer">
                    {importFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">{importFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Klicken oder Datei hierher ziehen</p>
                        <p className="text-xs text-gray-400 mt-1">.xlsx oder .xls</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Hinweise */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Erforderliche Spalten</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold">A</span> Teilnehmer</div>
                  <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold">B</span> Kurs</div>
                  <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold">C</span> Buchungsbeginn</div>
                  <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold">D</span> Buchungsende</div>
                  <div className="flex items-center gap-1.5 col-span-2"><span className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold">E+</span> Tages-Status (A, S, P, T, U, K, KK, FD, FE, FU, Ung, FT, WE)</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => setImportModal(false)} disabled={importLade}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50">
                Abbrechen
              </button>
              <button onClick={handleImportStart} disabled={!importFile || importLade}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {importLade ? 'Wird importiert...' : 'Import starten'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
