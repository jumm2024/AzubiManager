import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TermineListe from './TermineListe';
import * as client from '../api/client';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useOutletContext: () => ({ ladeBadges: vi.fn() }) };
});

vi.mock('../api/client', () => ({
  termineApi: { alle: vi.fn(), erstellen: vi.fn(), aktualisieren: vi.fn(), loeschen: vi.fn() },
  teilnehmerApi: { alle: vi.fn() },
}));

const mockTermineApi = client.termineApi.alle as any;
const mockTeilnehmerApi = client.teilnehmerApi.alle as any;

function renderTermineListe() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/termine']}>
        <Routes>
          <Route path="/termine" element={<TermineListe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TermineListe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt Ladezustand', () => {
    mockTermineApi.mockReturnValue(new Promise(() => {}));
    mockTeilnehmerApi.mockReturnValue(new Promise(() => {}));
    renderTermineListe();
    expect(screen.getByText('Lade Termine...')).toBeInTheDocument();
  });

  it('zeigt leere Liste', async () => {
    mockTermineApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);
    mockTeilnehmerApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);

    renderTermineListe();

    await waitFor(() => {
      expect(screen.getByText('Keine Termine vorhanden')).toBeInTheDocument();
    });
  });

  it('rendert Termine aus der API', async () => {
    const heute = new Date();
    const morgen = new Date(heute);
    morgen.setDate(morgen.getDate() + 1);

    mockTermineApi.mockResolvedValue({
      data: {
        items: [
          { id: 1, titel: 'Meeting mit Azubi', datum: morgen.toISOString(), kategorie: 'Sonstiges', azubiName: 'Max Mustermann' },
          { id: 2, titel: 'Prüfungsvorbereitung', datum: morgen.toISOString(), kategorie: 'Prüfung', ort: 'Raum 101' },
        ],
        totalCount: 2
      }
    } as never);
    mockTeilnehmerApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);

    renderTermineListe();

    await waitFor(() => {
      expect(screen.getByText('Meeting mit Azubi')).toBeInTheDocument();
      expect(screen.getByText('Prüfungsvorbereitung')).toBeInTheDocument();
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });
  });

  it('zeigt Statistik-Kacheln', async () => {
    mockTermineApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);
    mockTeilnehmerApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);

    renderTermineListe();

    await waitFor(() => {
      expect(screen.getByText('Gesamt')).toBeInTheDocument();
      expect(screen.getAllByText('Anstehend').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Vergangen').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('enthält Formular zum Erstellen', async () => {
    mockTermineApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);
    mockTeilnehmerApi.mockResolvedValue({ data: { items: [], totalCount: 0 } } as never);

    renderTermineListe();

    await waitFor(() => {
      expect(screen.getByText('Neuen Termin erstellen')).toBeInTheDocument();
    });
  });
});
