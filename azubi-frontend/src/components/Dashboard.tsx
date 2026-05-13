import { useQuery } from '@tanstack/react-query';
import { dashboardApi, termineApi } from '../api/client';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(res => res.data)
  });

  const { data: termine } = useQuery({
    queryKey: ['termine', 'anstehend'],
    queryFn: () => termineApi.alle().then(res =>
      res.data
        .filter((t: any) => new Date(t.datum) >= new Date())
        .sort((a: any, b: any) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
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
    { label: 'Freigestellt', wert: data?.freigestellt, color: 'bg-teal-500', bg: 'bg-teal-50' },
    { label: 'Entschuldigt', wert: data?.entschuldigt, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Unentschuldigt', wert: data?.unentschuldigt, color: 'bg-orange-500', bg: 'bg-orange-50' },
    { label: 'Ungeklaert', wert: data?.ungeklaert, color: 'bg-gray-400', bg: 'bg-gray-50' },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-gray-600 font-semibold">Lade Dashboard...</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <span className="text-sm text-gray-400">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {statKacheln.map((kachel) => (
          <div key={kachel.label}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default">
            <div className="flex items-center gap-3">
              <div className={`${kachel.color} w-3 h-3 rounded-full`} />
              <div>
                <p className="text-sm text-gray-600 font-semibold">{kachel.label}</p>
                <p className="text-2xl font-bold">{kachel.wert ?? 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <p className="text-sm text-gray-600 font-semibold">Offene Aufgaben</p>
            </div>
            <p className="text-2xl font-extrabold">{data.offeneAufgaben}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <p className="text-sm text-gray-600 font-semibold">Überfällig</p>
            </div>
            <p className="text-2xl font-extrabold">{data.ueberfaelligeAufgaben}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <p className="text-sm text-gray-600 font-semibold">Status fehlt</p>
            </div>
            <p className="text-2xl font-extrabold">{data.statusFehlt}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <p className="text-sm text-gray-600 font-semibold">Teilnehmer</p>
            </div>
            <p className="text-2xl font-extrabold">{data.teilnehmerGesamt}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Aufgaben heute</h3>
            <span className="ml-auto text-xs text-gray-400">{data.aufgabenHeute?.length || 0} Eintraege</span>
          </div>
          {data.aufgabenHeute?.length > 0 ? (
            <div className="space-y-1">
              {data.aufgabenHeute.map((aufgabe: any) => (
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
            <h3 className="text-lg font-semibold text-gray-800">Anstehende Termine</h3>
            <span className="ml-auto text-xs text-gray-400">Nächste 5</span>
          </div>
          {termine && termine.length > 0 ? (
            <div className="space-y-1">
              {termine.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                  <span className="flex-1 text-sm text-gray-700 min-w-0 truncate">{t.titel}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(t.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {t.azubiName && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg shrink-0">{t.azubiName}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8 text-sm">Keine anstehenden Termine</p>
          )}
        </div>
      </div>
    </div>
  );
}
