import { useQuery } from '@tanstack/react-query';
import { dashboardApi, termineApi, notizenApi } from '../api/client';
import type { Termin, Notiz, Aufgabe } from '../api/client';

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(res => res.data)
  });

  const { data: termine, error: termineError } = useQuery({
    queryKey: ['termine', 'anstehend'],
    queryFn: () => termineApi.alle().then(res =>
      res.data.items
        .filter((t: Termin) => new Date(t.datum) >= new Date(new Date().toDateString()))
        .sort((a: Termin, b: Termin) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
        .slice(0, 5)
    ),
  });

  const { data: notizen, error: notizenError } = useQuery({
    queryKey: ['notizen', 'dashboard'],
    queryFn: () => notizenApi.alle().then(res =>
      res.data.items
        .sort((a: Notiz, b: Notiz) => new Date(b.erstelltAm).getTime() - new Date(a.erstelltAm).getTime())
        .slice(0, 5)
    ),
  });

  const statKacheln = [
    { label: 'Anwesend', wert: data?.anwesend, color: 'bg-green-500', bg: 'bg-green-50' },
    { label: 'Schule', wert: data?.schule, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Praktikum', wert: data?.praktikum, color: 'bg-purple-500', bg: 'bg-purple-50' },
    { label: 'Termin', wert: data?.termin, color: 'bg-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Urlaub', wert: data?.urlaub, color: 'bg-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Krank', wert: data?.krank, color: 'bg-red-400', bg: 'bg-red-50' },
    { label: 'VAmB', wert: data?.vAmb, color: 'bg-cyan-500', bg: 'bg-cyan-50' },
    { label: 'Freigestellt', wert: data?.freigestellt, color: 'bg-teal-500', bg: 'bg-teal-50' },
    { label: 'Entschuldigt', wert: data?.entschuldigt, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Unentschuldigt', wert: data?.unentschuldigt, color: 'bg-orange-500', bg: 'bg-orange-50' },
    { label: 'Ungeklärt', wert: data?.ungeklaert, color: 'bg-gray-400', bg: 'bg-gray-50' },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-600 font-semibold">Lade Dashboard...</span>
    </div>
  );

  if (isError) return (
    <div className="text-center py-20">
      <p className="text-red-500 text-lg">Fehler beim Laden des Dashboards.</p>
      <p className="text-gray-400 text-sm mt-2">Bitte die Seite neu laden oder später erneut versuchen.</p>
    </div>
  );

  if (!data) return (
    <div className="text-center py-20">
      <p className="text-gray-400 text-lg">Dashboard-Daten konnten nicht geladen werden.</p>
      <p className="text-gray-400 text-sm mt-2">Bitte die Seite neu laden oder später erneut versuchen.</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {statKacheln.map((kachel) => (
          <div key={kachel.label}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default">
            <div className="flex items-center gap-3">
              <div className={`${kachel.color} w-3 h-3 rounded-full`} />
              <div>
                <p className="text-xs md:text-sm text-gray-600 font-semibold">{kachel.label}</p>
                <p className="text-lg md:text-2xl font-bold">{kachel.wert ?? 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <p className="text-xs md:text-sm text-gray-600 font-semibold">Offene Aufgaben</p>
            </div>
            <p className="text-lg md:text-2xl font-extrabold">{data?.offeneAufgaben ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <p className="text-xs md:text-sm text-gray-600 font-semibold">Überfällig</p>
            </div>
            <p className="text-lg md:text-2xl font-extrabold">{data?.ueberfaelligeAufgaben ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <p className="text-xs md:text-sm text-gray-600 font-semibold">Status fehlt</p>
            </div>
            <p className="text-lg md:text-2xl font-extrabold">{data?.statusFehlt ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <p className="text-xs md:text-sm text-gray-600 font-semibold">Teilnehmer</p>
            </div>
            <p className="text-lg md:text-2xl font-extrabold">{data?.teilnehmerGesamt ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-800">Anstehende Termine</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{termine?.length || 0} Eintraege</span>
          </div>
        </div>
        {termineError ? (
          <p className="text-red-400 text-center py-8 text-sm">Fehler beim Laden der Termine</p>
        ) : termine && termine.length > 0 ? (
          <div className="space-y-2">
            {termine.map((t: Termin) => {
              const start = new Date(t.datum);
              const end = t.endzeit ? new Date(t.endzeit) : null;
              const isToday = start.toDateString() === new Date().toDateString();
              return (
                <div key={t.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all bg-white group">
                  <div className="flex flex-col items-center gap-1 w-14 shrink-0">
                    <span className="text-xs font-bold text-gray-400 uppercase">
                      {start.toLocaleDateString('de-DE', { month: 'short' })}
                    </span>
                    <span className={`text-xl font-bold leading-none ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                      {start.getDate()}
                    </span>
                    {isToday && <span className="text-[10px] font-semibold text-blue-600">Heute</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 text-sm">{t.titel}</h4>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {end && (
                        <span className="text-[11px] text-gray-400">– {end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {t.ort && (
                        <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{t.ort}</span>
                      )}
                      {t.kategorie && t.kategorie !== 'Sonstiges' && (
                        <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{t.kategorie}</span>
                      )}
                      {t.azubiName && (
                        <span className="text-[11px] text-gray-500 bg-indigo-50 px-2 py-0.5 rounded">{t.azubiName}</span>
                      )}
                    </div>
                    {t.beschreibung && (
                      <p className="text-xs text-gray-400 mt-1.5">{t.beschreibung}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8 text-sm">Keine anstehenden Termine</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Aufgaben heute</h3>
            <span className="ml-auto text-xs text-gray-400">{data.aufgabenHeute?.length || 0} Eintraege</span>
          </div>
          {data.aufgabenHeute?.length > 0 ? (
            <div className="space-y-1">
              {data.aufgabenHeute.map((aufgabe: Aufgabe) => (
                <div key={aufgabe.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                    aufgabe.prioritaet === 'Hoch' ? 'bg-red-500' : 
                    aufgabe.prioritaet === 'Mittel' ? 'bg-amber-400' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-800 font-medium block truncate">{aufgabe.titel}</span>
                    <span className="text-xs text-gray-400 block">
                      {aufgabe.beschreibung && <>{aufgabe.beschreibung} · </>}
                      Fällig: {new Date(aufgabe.faelligkeitsdatum).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  {aufgabe.azubiName && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg shrink-0 mt-0.5">{aufgabe.azubiName}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8 text-sm">Keine Aufgaben fuer heute</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Notizen</h3>
            <span className="ml-auto text-xs text-gray-400">{notizen?.length || 0} Eintraege</span>
          </div>
          {notizenError ? (
            <p className="text-red-400 text-center py-8 text-sm">Fehler beim Laden der Notizen</p>
          ) : notizen && notizen.length > 0 ? (
            <div className="space-y-2">
              {notizen.map((n: Notiz) => (
                <div key={n.id} className="p-3 rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-gray-800 text-sm">{n.titel}</h4>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(n.erstelltAm).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                  </div>
                  {n.inhalt && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.inhalt}</p>
                  )}
                  {n.azubiName && (
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mt-1 inline-block">{n.azubiName}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8 text-sm">Keine Notizen vorhanden</p>
          )}
        </div>
      </div>
    </div>
  );
}
