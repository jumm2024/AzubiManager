import { useOutletContext } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teilnehmerApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Teilnehmer {
  id: number;
  vorname: string;
  nachname: string;
  gruppe: string;
  lehrjahr: number;
  abteilung?: string;
  kurs?: string;
  ausbildungsstart?: string;
  ausbildungsende?: string;
  geburtsdatum?: string;
  istBetreut?: boolean;
}

const gruppen = ['Ausbildung', 'BVB', 'Erprober', 'Praktikant'];
const gruppePunkte: Record<string, string> = {
  Ausbildung: 'bg-blue-500',
  BVB: 'bg-orange-500',
  Erprober: 'bg-green-500',
  Praktikant: 'bg-purple-500',
};
const gruppeFarben: Record<string, string> = {
  Ausbildung: 'bg-blue-100 text-blue-700',
  BVB: 'bg-orange-100 text-orange-700',
  Erprober: 'bg-green-100 text-green-700',
  Praktikant: 'bg-purple-100 text-purple-700',
};

export default function TeilnehmerListe() {
  const { user } = useAuth();
  const [gruppeFilter, setGruppeFilter] = useState('');
  const [nurMeine, setNurMeine] = useState(false);
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [gruppe, setGruppe] = useState('Ausbildung');
  const [lehrjahr, setLehrjahr] = useState(1);
  const hatLehrjahr = gruppe === 'Ausbildung';
  const [abteilung, setAbteilung] = useState('');
  const [ausbildungsstart, setAusbildungsstart] = useState('');
  const [ausbildungsende, setAusbildungsende] = useState('');
  const [fehler, setFehler] = useState('');
  const [erfolg, setErfolg] = useState('');
  const [letzterErstellterId, setLetzterErstellterId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBody, setPendingBody] = useState<{ vorname: string; nachname: string; gruppe: string; lehrjahr: number; abteilung?: string; ausbildungsstart?: string; ausbildungsende?: string } | null>(null);
  const [bearbeitenTeilnehmer, setBearbeitenTeilnehmer] = useState<Teilnehmer | null>(null);
  const [bearbeitenVorname, setBearbeitenVorname] = useState('');
  const [bearbeitenNachname, setBearbeitenNachname] = useState('');
  const [bearbeitenGruppe, setBearbeitenGruppe] = useState('Ausbildung');
  const [bearbeitenLehrjahr, setBearbeitenLehrjahr] = useState(1);
  const [bearbeitenAbteilung, setBearbeitenAbteilung] = useState('');
  const [bearbeitenAusbildungsstart, setBearbeitenAusbildungsstart] = useState('');
  const [bearbeitenAusbildungsende, setBearbeitenAusbildungsende] = useState('');
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { ladeBadges } = useOutletContext<{ ladeBadges: () => void }>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['teilnehmer', gruppeFilter],
    queryFn: () => teilnehmerApi.alle(gruppeFilter || undefined).then(res => res.data as unknown as Teilnehmer[])
  });

  const angezeigte = nurMeine ? (data?.filter(t => t.istBetreut) ?? []) : (data ?? []);

  const erstelleMutation = useMutation({
    mutationFn: (d: { vorname: string; nachname: string; gruppe: string; lehrjahr: number; abteilung?: string; ausbildungsstart?: string; ausbildungsende?: string }) => teilnehmerApi.erstellen(d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['teilnehmer'] });
      ladeBadges();
      const created = (res as { data: { id: number } }).data;
      setLetzterErstellterId(created.id);
      setVorname('');
      setNachname('');
      setGruppe('Ausbildung');
      setLehrjahr(1);
      setAbteilung('');
      setAusbildungsstart('');
      setAusbildungsende('');
      setFehler('');
      setErfolg('Teilnehmer erstellt');
      timerRef.current = setTimeout(() => { setErfolg(''); setLetzterErstellterId(null); }, 8000);
    },
    onError: (error: { response?: { data?: string | { title?: string } } }) => {
      const d = error.response?.data;
      if (typeof d === 'string') setFehler(d);
      else if (d?.title) setFehler(d.title);
      else setFehler('Unbekannter Fehler beim Erstellen');
    }
  });

  const loescheMutation = useMutation({
    mutationFn: (id: number) => teilnehmerApi.loeschen(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teilnehmer'] }); ladeBadges(); },
  });

  const aktualisierenMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { vorname: string; nachname: string; gruppe: string; lehrjahr: number; abteilung?: string; ausbildungsstart?: string; ausbildungsende?: string } }) => teilnehmerApi.aktualisieren(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teilnehmer'] });
      ladeBadges();
      setBearbeitenTeilnehmer(null);
      setErfolg('Teilnehmer aktualisiert');
      timerRef.current = setTimeout(() => setErfolg(''), 3000);
    },
    onError: (error: { response?: { data?: string | { title?: string } } }) => {
      const d = error.response?.data;
      if (typeof d === 'string') setFehler(d);
      else if (d?.title) setFehler(d.title);
      else setFehler('Fehler beim Aktualisieren');
    }
  });

  const betreuenMutation = useMutation({
    mutationFn: (id: number) => teilnehmerApi.betreuen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teilnehmer'] });
      ladeBadges();
    },
    onError: (err: unknown) => {
      setFehler('Fehler beim Betreuen: ' + ((err as {response?: {data?: string}}).response?.data || 'Unbekannter Fehler'));
    }
  });

  const nichtBetreuenMutation = useMutation({
    mutationFn: (id: number) => teilnehmerApi.nichtBetreuen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teilnehmer'] });
      ladeBadges();
    },
    onError: (err: unknown) => {
      setFehler('Fehler beim Entfernen der Betreuung: ' + ((err as {response?: {data?: string}}).response?.data || 'Unbekannter Fehler'));
    }
  });

  const handleBearbeitenOeffnen = (t: Teilnehmer) => {
    setBearbeitenTeilnehmer(t);
    setBearbeitenVorname(t.vorname);
    setBearbeitenNachname(t.nachname);
    setBearbeitenGruppe(t.gruppe);
    setBearbeitenLehrjahr(t.lehrjahr);
    setBearbeitenAbteilung(t.abteilung || '');
    setBearbeitenAusbildungsstart(t.ausbildungsstart ? t.ausbildungsstart.slice(0, 10) : '');
    setBearbeitenAusbildungsende(t.ausbildungsende ? t.ausbildungsende.slice(0, 10) : '');
    setFehler('');
  };

  const handleAktualisieren = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!bearbeitenTeilnehmer) return;
    if (!bearbeitenVorname.trim()) { setFehler('Vorname ist erforderlich'); return; }
    if (!bearbeitenNachname.trim()) { setFehler('Nachname ist erforderlich'); return; }
    if (bearbeitenGruppe === 'Ausbildung') {
      if (!bearbeitenAusbildungsstart) { setFehler('Ausbildungsstart ist erforderlich'); return; }
      if (!bearbeitenAusbildungsende) { setFehler('Ausbildungsende ist erforderlich'); return; }
      if (bearbeitenAusbildungsstart >= bearbeitenAusbildungsende) { setFehler('Ende muss nach dem Start liegen'); return; }
    }

    const body: { vorname: string; nachname: string; gruppe: string; lehrjahr: number; abteilung?: string; ausbildungsstart?: string; ausbildungsende?: string } = {
      vorname: bearbeitenVorname.trim(),
      nachname: bearbeitenNachname.trim(),
      gruppe: bearbeitenGruppe,
      lehrjahr: bearbeitenGruppe === 'Ausbildung' ? bearbeitenLehrjahr : 0,
      abteilung: bearbeitenAbteilung.trim() || undefined,
      ausbildungsstart: bearbeitenAusbildungsstart || undefined,
      ausbildungsende: bearbeitenAusbildungsende || undefined,
    };
    aktualisierenMutation.mutate({ id: bearbeitenTeilnehmer.id, data: body });
  };

  const handleErstellen = (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    if (!vorname.trim()) { setFehler('Vorname ist erforderlich'); return; }
    if (vorname.trim().length < 2) { setFehler('Vorname muss mindestens 2 Zeichen haben'); return; }
    if (!nachname.trim()) { setFehler('Nachname ist erforderlich'); return; }
    if (nachname.trim().length < 2) { setFehler('Nachname muss mindestens 2 Zeichen haben'); return; }
    if (gruppe === 'Ausbildung') {
      if (!ausbildungsstart) { setFehler('Ausbildungsstart ist erforderlich'); return; }
      if (!ausbildungsende) { setFehler('Ausbildungsende ist erforderlich'); return; }
      if (ausbildungsstart >= ausbildungsende) { setFehler('Ende muss nach dem Start liegen'); return; }
    }

    const body: { vorname: string; nachname: string; gruppe: string; lehrjahr: number; abteilung?: string; ausbildungsstart?: string; ausbildungsende?: string } = {
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      gruppe,
      lehrjahr: hatLehrjahr ? lehrjahr : 0,
      abteilung: abteilung.trim() || undefined,
      ausbildungsstart: ausbildungsstart || undefined,
      ausbildungsende: ausbildungsende || undefined,
    };
    setPendingBody(body);
    setShowConfirm(true);
  };

  const handleConfirmJa = () => {
    if (pendingBody) erstelleMutation.mutate(pendingBody);
    setShowConfirm(false);
    setPendingBody(null);
  };
  const handleConfirmNein = () => {
    setShowConfirm(false);
    setPendingBody(null);
  };

  const counts = gruppen.map(g => ({
    gruppe: g,
    count: data ? data.filter(t => t.gruppe === g).length : 0,
  }));

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-500">Lade Teilnehmer...</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Teilnehmer</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Gesamt</p>
              <p className="text-lg md:text-2xl font-bold">{data?.length || 0}</p>
            </div>
          </div>
        </div>
        {counts.map(({ gruppe: g, count }) => (
          <div key={g} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${gruppePunkte[g] || 'bg-gray-400'}`} />
              <div>
                <p className="text-sm text-gray-500">{g}</p>
                <p className="text-lg md:text-2xl font-bold">{count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {erfolg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          <span>{erfolg}</span>
          {letzterErstellterId && (
            <button onClick={() => { loescheMutation.mutate(letzterErstellterId); setLetzterErstellterId(null); setErfolg(''); }}
              className="text-xs font-medium text-red-600 hover:text-red-800 bg-white px-2 py-1 rounded border border-red-200 hover:border-red-400 transition-colors">
              Rückgängig (löschen)
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {['', ...gruppen].map(g => (
            <button key={g || 'alle'} onClick={() => setGruppeFilter(g)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                gruppeFilter === g ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {g || 'Alle'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setNurMeine(false)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              !nurMeine ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            Alle
          </button>
          <button onClick={() => setNurMeine(true)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              nurMeine ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            Meine
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Neuen Teilnehmer anlegen</h3>
          <form onSubmit={handleErstellen} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tn-vorname" className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
                <input id="tn-vorname" name="vorname" type="text" value={vorname} onChange={(e) => setVorname(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Vorname" required />
              </div>
              <div>
                <label htmlFor="tn-nachname" className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
                <input id="tn-nachname" name="nachname" type="text" value={nachname} onChange={(e) => setNachname(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nachname" required />
              </div>
              <div>
                <label htmlFor="tn-gruppe" className="block text-sm font-medium text-gray-700 mb-1">Gruppe</label>
                <select id="tn-gruppe" name="gruppe" value={gruppe} onChange={(e) => { setGruppe(e.target.value); if (e.target.value !== 'Ausbildung') setLehrjahr(0); else if (lehrjahr === 0) setLehrjahr(1); }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  {gruppen.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {hatLehrjahr && (
                <div>
                  <label htmlFor="tn-lehrjahr" className="block text-sm font-medium text-gray-700 mb-1">Lehrjahr</label>
                  <select id="tn-lehrjahr" name="lehrjahr" value={lehrjahr} onChange={(e) => setLehrjahr(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    {[1,2,3,4].map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="tn-abteilung" className="block text-sm font-medium text-gray-700 mb-1">Abteilung</label>
                <input id="tn-abteilung" name="abteilung" type="text" value={abteilung} onChange={(e) => setAbteilung(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="z.B. IT" />
              </div>
              <div>
                <label htmlFor="tn-start" className="block text-sm font-medium text-gray-700 mb-1">Start {gruppe === 'Ausbildung' && <span className="text-red-500">*</span>}</label>
                <input id="tn-start" name="ausbildungsstart" type="date" value={ausbildungsstart} onChange={(e) => setAusbildungsstart(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label htmlFor="tn-ende" className="block text-sm font-medium text-gray-700 mb-1">Ende {gruppe === 'Ausbildung' && <span className="text-red-500">*</span>}</label>
                <input id="tn-ende" name="ausbildungsende" type="date" value={ausbildungsende} onChange={(e) => setAusbildungsende(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            {fehler && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{fehler}</div>
            )}

            <button type="submit" disabled={erstelleMutation.isPending}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {erstelleMutation.isPending ? 'Wird erstellt...' : 'Teilnehmer erstellen'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">Alle Teilnehmer</h3>
            <span className="text-xs text-gray-400">{angezeigte.length} Einträge</span>
          </div>
          <div className="p-3 space-y-2">
            {angezeigte.map((t: Teilnehmer) => (
              <div key={t.id} className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${
                  t.gruppe === 'Ausbildung' ? 'bg-blue-500' :
                  t.gruppe === 'BVB' ? 'bg-orange-500' :
                  t.gruppe === 'Erprober' ? 'bg-green-500' : 'bg-purple-500'
                }`}>
                  {t.vorname[0]}{t.nachname[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-gray-800 text-sm">{t.vorname} {t.nachname}</h4>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.istBetreut ? (
                        <button onClick={() => nichtBetreuenMutation.mutate(t.id)}
                          className="text-xs text-orange-400 hover:text-orange-600 px-1.5 py-0.5 rounded hover:bg-orange-50 transition-colors">Entfernen</button>
                      ) : (
                        <button onClick={() => betreuenMutation.mutate(t.id)}
                          className="text-xs text-green-400 hover:text-green-600 px-1.5 py-0.5 rounded hover:bg-green-50 transition-colors">+ Betreuen</button>
                      )}
                      <button onClick={() => handleBearbeitenOeffnen(t)}
                        className="text-xs text-blue-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">Bearbeiten</button>
                      {user?.rolle === 'Admin' && (
                        <button onClick={() => { if (confirm('Teilnehmer löschen?')) loescheMutation.mutate(t.id); }}
                          className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">Löschen</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {t.istBetreut && (
                      <span className="text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-medium">Betreut</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${gruppeFarben[t.gruppe] || 'bg-gray-100 text-gray-600'}`}>
                      {t.kurs || t.gruppe}
                    </span>
                    {t.lehrjahr > 0 && <span className="text-[11px] text-gray-400">{t.lehrjahr}. Lehrjahr</span>}
                    {t.abteilung && (
                      <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{t.abteilung}</span>
                    )}
                    {t.ausbildungsstart && t.ausbildungsstart !== '0001-01-01' && (
                      <span className="text-[11px] text-gray-400">
                        {new Date(t.ausbildungsstart).toLocaleDateString('de-DE')} – {t.ausbildungsende && t.ausbildungsende !== '0001-01-01' ? new Date(t.ausbildungsende).toLocaleDateString('de-DE') : '?'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {angezeigte.length === 0 && (
              <p className="text-gray-400 text-center py-10 text-sm">Keine Teilnehmer vorhanden</p>
            )}
          </div>
        </div>
      </div>
      {bearbeitenTeilnehmer && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Teilnehmer bearbeiten</h3>
              <button onClick={() => setBearbeitenTeilnehmer(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleAktualisieren} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-tn-vorname" className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
                  <input id="edit-tn-vorname" name="vorname" type="text" value={bearbeitenVorname} onChange={(e) => setBearbeitenVorname(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label htmlFor="edit-tn-nachname" className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
                  <input id="edit-tn-nachname" name="nachname" type="text" value={bearbeitenNachname} onChange={(e) => setBearbeitenNachname(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label htmlFor="edit-tn-gruppe" className="block text-sm font-medium text-gray-700 mb-1">Gruppe</label>
                  <select id="edit-tn-gruppe" name="gruppe" value={bearbeitenGruppe} onChange={(e) => { setBearbeitenGruppe(e.target.value); if (e.target.value !== 'Ausbildung') setBearbeitenLehrjahr(0); else if (bearbeitenLehrjahr === 0) setBearbeitenLehrjahr(1); }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    {gruppen.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {bearbeitenGruppe === 'Ausbildung' && (
                  <div>
                    <label htmlFor="edit-tn-lehrjahr" className="block text-sm font-medium text-gray-700 mb-1">Lehrjahr</label>
                    <select id="edit-tn-lehrjahr" name="lehrjahr" value={bearbeitenLehrjahr} onChange={(e) => setBearbeitenLehrjahr(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      {[1,2,3,4].map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="edit-tn-abteilung" className="block text-sm font-medium text-gray-700 mb-1">Abteilung</label>
                  <input id="edit-tn-abteilung" name="abteilung" type="text" value={bearbeitenAbteilung} onChange={(e) => setBearbeitenAbteilung(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="z.B. IT" />
                </div>
                <div>
                  <label htmlFor="edit-tn-start" className="block text-sm font-medium text-gray-700 mb-1">Start {bearbeitenGruppe === 'Ausbildung' && <span className="text-red-500">*</span>}</label>
                  <input id="edit-tn-start" name="ausbildungsstart" type="date" value={bearbeitenAusbildungsstart} onChange={(e) => setBearbeitenAusbildungsstart(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label htmlFor="edit-tn-ende" className="block text-sm font-medium text-gray-700 mb-1">Ende {bearbeitenGruppe === 'Ausbildung' && <span className="text-red-500">*</span>}</label>
                  <input id="edit-tn-ende" name="ausbildungsende" type="date" value={bearbeitenAusbildungsende} onChange={(e) => setBearbeitenAusbildungsende(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
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
                <button type="button" onClick={() => setBearbeitenTeilnehmer(null)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Teilnehmer speichern?</h3>
            <p className="text-sm text-gray-500 mb-6">
              {pendingBody?.vorname} {pendingBody?.nachname} ({pendingBody?.gruppe}) wirklich anlegen?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleConfirmNein}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
                Nein
              </button>
              <button onClick={handleConfirmJa}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm">
                Ja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
