import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagesstatusApi, teilnehmerApi } from '../api/client';

const statusListe = ['Anwesend', 'Schule', 'Praktikum', 'Termin', 'Urlaub', 'Krank', 'Kind krank', 'Freigestellt', 'Entschuldigt', 'Unentschuldigt', 'Ungeklaert'];

const statusFarben: Record<string, string> = {
  Anwesend: 'bg-green-500',
  Schule: 'bg-blue-500',
  Praktikum: 'bg-purple-500',
  Termin: 'bg-indigo-500',
  Urlaub: 'bg-yellow-500',
  Krank: 'bg-red-400',
  'Kind krank': 'bg-pink-400',
  Freigestellt: 'bg-teal-500',
  Entschuldigt: 'bg-emerald-500',
  Unentschuldigt: 'bg-orange-500',
  Ungeklaert: 'bg-gray-400',
};

const statusBgFarben: Record<string, string> = {
  Anwesend: 'bg-green-50 border-green-200 text-green-700',
  Schule: 'bg-blue-50 border-blue-200 text-blue-700',
  Praktikum: 'bg-purple-50 border-purple-200 text-purple-700',
  Termin: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  Urlaub: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  Krank: 'bg-red-50 border-red-200 text-red-700',
  'Kind krank': 'bg-pink-50 border-pink-200 text-pink-700',
  Freigestellt: 'bg-teal-50 border-teal-200 text-teal-700',
  Entschuldigt: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Unentschuldigt: 'bg-orange-50 border-orange-200 text-orange-700',
  Ungeklaert: 'bg-gray-50 border-gray-200 text-gray-700',
};

export default function TagesstatusListe() {
  const heute = new Date().toISOString().slice(0, 10);
  const [datum, setDatum] = useState(heute);
  const [lokaleStatus, setLokaleStatus] = useState<Record<number, string>>({});
  const [importMsg, setImportMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['tagesstatus', datum],
    queryFn: () => tagesstatusApi.alleFuerDatum(datum).then(res => res.data),
  });

  const { data: alleTeilnehmer } = useQuery({
    queryKey: ['teilnehmer'],
    queryFn: () => teilnehmerApi.alle().then(res => res.data),
  });

  const setzenMutation = useMutation({
    mutationFn: (d: { azubiId: number; datum: string; status: string; bemerkung?: string }) => tagesstatusApi.setzen(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tagesstatus', datum] }),
  });

  const mergeData = (alleTeilnehmer as unknown as { id: number; vorname: string; nachname: string; gruppe: string; lehrjahr: number }[])?.map((t) => {
    const existing = statusData?.find((s) => (s as { azubiId?: number }).azubiId === t.id);
    return { ...t, statusId: existing?.id, status: (existing as { status?: string })?.status || '', bemerkung: (existing as { bemerkung?: string })?.bemerkung || '' };
  }) || [];

  const statusCounts = statusListe.map(s => ({
    status: s,
    count: mergeData.filter((t: { status: string }) => t.status === s).length,
  }));

  const handleStatusChange = (azubiId: number, neuerStatus: string) => {
    setLokaleStatus(prev => ({ ...prev, [azubiId]: neuerStatus }));
    setzenMutation.mutate({ azubiId, datum, status: neuerStatus });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-500">Lade Tagesstatus...</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tagesstatus</h2>
        {importMsg && <span className="text-sm text-green-600">{importMsg}</span>}
        <div className="flex items-center gap-3">
          <input type="file" accept=".xlsx,.xls" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImportMsg('');
            try {
              const res = await tagesstatusApi.import(file);
              setImportMsg(`${res.data.imported} Einträge importiert`);
              queryClient.invalidateQueries({ queryKey: ['tagesstatus', datum] });
            } catch { setImportMsg('Import fehlgeschlagen'); }
            e.target.value = '';
          }} className="hidden" id="excel-import" />
          <label htmlFor="excel-import"
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer">
            Excel Import
          </label>
          <button onClick={async () => {
            const res = await tagesstatusApi.export(new Date(datum).getFullYear(), new Date(datum).getMonth() + 1);
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a'); a.href = url; a.download = `Tagesstatus_${new Date(datum).getFullYear()}_${String(new Date(datum).getMonth() + 1).padStart(2, '0')}.xlsx`; a.click();
            URL.revokeObjectURL(url);
          }}
            className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium">
            Excel Export
          </button>
          <button onClick={async () => {
            const res = await tagesstatusApi.bericht(new Date(datum).getFullYear(), new Date(datum).getMonth() + 1);
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a'); a.href = url; a.download = `AzubiBericht_${new Date(datum).getFullYear()}_${String(new Date(datum).getMonth() + 1).padStart(2, '0')}.xlsx`; a.click();
            URL.revokeObjectURL(url);
          }}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium">
            Azubi-Bericht
          </button>
          <button onClick={async () => {
            const res = await tagesstatusApi.berichtGesamt();
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a'); a.href = url; a.download = `AzubiBericht_Gesamt.xlsx`; a.click();
            URL.revokeObjectURL(url);
          }}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium">
            Gesamt-Bericht
          </button>
          <input id="tagesstatus-datum" name="datum" type="date" value={datum} onChange={(e) => { setDatum(e.target.value); setLokaleStatus({}); }}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Excel-Import Hinweise</h3>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Erforderliche Spalten</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">A</span>
                <span className="text-sm text-gray-700">Teilnehmer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">B</span>
                <span className="text-sm text-gray-700">Kurs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">C</span>
                <span className="text-sm text-gray-700">Buchungsbeginn</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">D</span>
                <span className="text-sm text-gray-700">Buchungsende</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">E+</span>
                <span className="text-sm text-gray-700">Tages-Status (pro Tag)</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status-Kürzel</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-green-50">
                <span className="text-xs font-bold text-green-700 w-6">A</span>
                <span className="text-xs text-green-600">Anwesend</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-50">
                <span className="text-xs font-bold text-blue-700 w-6">S</span>
                <span className="text-xs text-blue-600">Schule</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-purple-50">
                <span className="text-xs font-bold text-purple-700 w-6">P</span>
                <span className="text-xs text-purple-600">Praktikum</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-indigo-50">
                <span className="text-xs font-bold text-indigo-700 w-6">T</span>
                <span className="text-xs text-indigo-600">Termin</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-yellow-50">
                <span className="text-xs font-bold text-yellow-700 w-6">U</span>
                <span className="text-xs text-yellow-600">Urlaub</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-red-50">
                <span className="text-xs font-bold text-red-700 w-6">K</span>
                <span className="text-xs text-red-600">Krank</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-pink-50">
                <span className="text-xs font-bold text-pink-700 w-6">KK</span>
                <span className="text-xs text-pink-600">Kind krank</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-teal-50">
                <span className="text-xs font-bold text-teal-700 w-6">FD</span>
                <span className="text-xs text-teal-600">Freigestellt</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-50">
                <span className="text-xs font-bold text-emerald-700 w-6">FE</span>
                <span className="text-xs text-emerald-600">Entschuldigt</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-orange-50">
                <span className="text-xs font-bold text-orange-700 w-6">FU</span>
                <span className="text-xs text-orange-600">Unentschuldigt</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50 col-span-2">
                <span className="text-xs font-bold text-gray-700 w-6">UN</span>
                <span className="text-xs text-gray-600">Ungeklärt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4 mb-8">
        {statusCounts.map(({ status: s, count }) => (
          <div key={s} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusFarben[s] || 'bg-gray-400'}`} />
              <div>
                <p className="text-sm text-gray-500">{s}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="divide-y divide-gray-100">
          {mergeData.map((t: { id: number; vorname: string; nachname: string; gruppe: string; lehrjahr: number; status: string; statusId?: number; bemerkung: string }) => (
            <div key={t.id} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold shrink-0 text-sm">
                {t.vorname?.[0]}{t.nachname?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{t.vorname} {t.nachname}</p>
                <p className="text-xs text-gray-400">{t.gruppe}{t.gruppe === 'Ausbildung' ? ` - Lehrjahr ${t.lehrjahr}` : ''}</p>
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
    </div>
  );
}
