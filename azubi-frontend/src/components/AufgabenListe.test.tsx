import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AufgabenListe from './AufgabenListe';
import * as client from '../api/client';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useOutletContext: () => ({ ladeBadges: vi.fn() }) };
});

vi.mock('../api/client', () => ({
  aufgabenApi: { alle: vi.fn(), erstellen: vi.fn(), aktualisieren: vi.fn(), loeschen: vi.fn(), toggleErledigt: vi.fn() },
  teilnehmerApi: { alle: vi.fn() },
}));

const mockAufgabenApi = client.aufgabenApi.alle as MockedFunction<typeof client.aufgabenApi.alle>;
const mockTeilnehmerApi = client.teilnehmerApi.alle as MockedFunction<typeof client.teilnehmerApi.alle>;

function renderAufgabenListe() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/aufgaben']}>
        <Routes>
          <Route path="/aufgaben" element={<AufgabenListe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AufgabenListe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt Ladezustand', () => {
    mockAufgabenApi.mockReturnValue(new Promise(() => {}));
    mockTeilnehmerApi.mockReturnValue(new Promise(() => {}));
    renderAufgabenListe();
    expect(screen.getByText('Lade Aufgaben...')).toBeInTheDocument();
  });

  it('zeigt leere Liste', async () => {
    mockAufgabenApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);
    mockTeilnehmerApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);

    renderAufgabenListe();

    await waitFor(() => {
      expect(screen.getByText('Keine Aufgaben vorhanden')).toBeInTheDocument();
    });
  });

  it('rendert Aufgaben aus der API', async () => {
    mockAufgabenApi.mockResolvedValue({
      data: {
        items: [
          { id: 1, titel: 'Bericht schreiben', prioritaet: 'Hoch', faelligkeitsdatum: '2026-06-15', erledigt: false, azubiName: 'Max Mustermann' },
          { id: 2, titel: 'Dokumentation lesen', prioritaet: 'Niedrig', faelligkeitsdatum: '2026-06-20', erledigt: true, azubiName: '' },
        ],
        totalCount: 2
      }
    } as never);
    mockTeilnehmerApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);

    renderAufgabenListe();

    await waitFor(() => {
      expect(screen.getByText('Bericht schreiben')).toBeInTheDocument();
      expect(screen.getByText('Dokumentation lesen')).toBeInTheDocument();
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });
  });

  it('zeigt Statistik-Kacheln', async () => {
    mockAufgabenApi.mockResolvedValue({
      data: {
        items: [
          { id: 1, titel: 'A1', prioritaet: 'Hoch', faelligkeitsdatum: '2026-06-01', erledigt: false },
          { id: 2, titel: 'A2', prioritaet: 'Mittel', faelligkeitsdatum: '2026-07-01', erledigt: true },
          { id: 3, titel: 'A3', prioritaet: 'Hoch', faelligkeitsdatum: '2025-01-01', erledigt: false },
        ],
        totalCount: 3
      }
    } as never);
    mockTeilnehmerApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);

    renderAufgabenListe();

    await waitFor(() => {
      expect(screen.getByText('Gesamt')).toBeInTheDocument();
      expect(screen.getByText('Offen')).toBeInTheDocument();
      expect(screen.getByText('Überfällig')).toBeInTheDocument();
      expect(screen.getByText('Erledigt')).toBeInTheDocument();
    });
  });

  it('enthält Formular zum Erstellen', async () => {
    mockAufgabenApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);
    mockTeilnehmerApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);

    renderAufgabenListe();

    await waitFor(() => {
      expect(screen.getByText('Neue Aufgabe erstellen')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Aufgabentitel')).toBeInTheDocument();
    });
  });
});
