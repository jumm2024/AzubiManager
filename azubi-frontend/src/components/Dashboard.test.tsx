import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  dashboardApi: { get: vi.fn() },
  termineApi: { alle: vi.fn() },
  notizenApi: { alle: vi.fn() },
  allgemeineInfoApi: { alle: vi.fn() },
}));

const mockDashboardApi = client.dashboardApi.get as MockedFunction<typeof client.dashboardApi.get>;
const mockTermineApi = client.termineApi.alle as MockedFunction<typeof client.termineApi.alle>;
const mockNotizenApi = client.notizenApi.alle as MockedFunction<typeof client.notizenApi.alle>;
const mockAllgemeineInfoApi = client.allgemeineInfoApi.alle as MockedFunction<typeof client.allgemeineInfoApi.alle>;

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><Dashboard /></QueryClientProvider>);
}

const mockData = {
  anwesend: 5, schule: 2, praktikum: 1, termin: 0, urlaub: 1, krank: 1,
  kindKrank: 0, vAmB: 0, freigestellt: 0, entschuldigt: 0, unentschuldigt: 0, ungeklaert: 0,
  offeneAufgaben: 3, ueberfaelligeAufgaben: 1, statusFehlt: 2,
  teilnehmerGesamt: 12, betreuteTeilnehmer: 10,
  aufgabenHeute: [
    { id: 1, titel: 'Bericht schreiben', prioritaet: 'Hoch', faelligkeitsdatum: new Date().toISOString().split('T')[0], erledigt: false, beschreibung: '', azubiName: '' },
  ],
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt Ladezustand', () => {
    mockDashboardApi.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText('Lade Dashboard...')).toBeInTheDocument();
  });

  it('zeigt Fehlerzustand', async () => {
    mockDashboardApi.mockRejectedValue(new Error('API Error'));
    renderDashboard();
    expect(await screen.findByText('Fehler beim Laden des Dashboards.')).toBeInTheDocument();
  });

  it('zeigt Dashboard-Daten nach erfolgreichem Laden', async () => {
    mockDashboardApi.mockResolvedValue({ data: mockData } as any);
    mockTermineApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as any);
    mockNotizenApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as any);
    mockAllgemeineInfoApi.mockResolvedValue({ data: [] } as any);

    renderDashboard();

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Anwesend')).toBeInTheDocument();
    expect(screen.getAllByText('5')[0]).toBeInTheDocument();
    expect(screen.getByText('Krank')).toBeInTheDocument();
    expect(screen.getByText('Bericht schreiben')).toBeInTheDocument();
  });

  it('zeigt leere Listen wenn keine Daten vorhanden', async () => {
    mockDashboardApi.mockResolvedValue({ data: { ...mockData, aufgabenHeute: [] } } as any);
    mockTermineApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as any);
    mockNotizenApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as any);
    mockAllgemeineInfoApi.mockResolvedValue({ data: [] } as any);

    renderDashboard();

    expect(await screen.findByText('Keine Aufgaben fuer heute')).toBeInTheDocument();
    expect(screen.getByText('Keine anstehenden Termine')).toBeInTheDocument();
    expect(screen.getByText('Keine Notizen vorhanden')).toBeInTheDocument();
  });

  it('zeigt Allgemeine Informationen aus der API', async () => {
    mockDashboardApi.mockResolvedValue({ data: mockData } as any);
    mockTermineApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as any);
    mockNotizenApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as any);
    mockAllgemeineInfoApi.mockResolvedValue({
      data: [
        { id: 1, bezeichnung: 'Kassenöffnungszeiten', wert: 'Mo–Fr 08:00–18:00', sortierung: 1 },
        { id: 2, bezeichnung: 'Medizinischer Dienst', wert: 'Dr. Schmidt, Di+Do 14-16', sortierung: 2 },
        { id: 3, bezeichnung: 'Notfallnummer', wert: '112', sortierung: 3 },
      ],
    } as any);

    renderDashboard();

    expect(await screen.findByText('Allgemeine Informationen')).toBeInTheDocument();
    expect(screen.getByText('Kassenöffnungszeiten')).toBeInTheDocument();
    expect(screen.getByText('Medizinischer Dienst')).toBeInTheDocument();
    expect(screen.getByText('Notfallnummer')).toBeInTheDocument();
    expect(screen.getByText('Mo–Fr 08:00–18:00')).toBeInTheDocument();
    expect(screen.getByText('Dr. Schmidt, Di+Do 14-16')).toBeInTheDocument();
  });

  it('zeigt Platzhalter wenn keine Allgemeine Informationen hinterlegt', async () => {
    mockDashboardApi.mockResolvedValue({ data: mockData } as any);
    mockTermineApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as any);
    mockNotizenApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as any);
    mockAllgemeineInfoApi.mockResolvedValue({ data: [] } as any);

    renderDashboard();

    expect(await screen.findByText('Keine Informationen hinterlegt')).toBeInTheDocument();
  });
});
