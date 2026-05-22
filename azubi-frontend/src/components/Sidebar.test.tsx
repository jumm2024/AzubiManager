import { describe, it, expect, vi, MockedFunction } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  authApi: {
    login: vi.fn(), logout: vi.fn(), me: vi.fn().mockRejectedValue(new Error('no session')),
    passwortAendern: vi.fn(),
  },
  dashboardApi: { get: vi.fn() },
}));

const mockPasswortAendern = client.authApi.passwortAendern as MockedFunction<typeof client.authApi.passwortAendern>;

function renderSidebar(badges: Record<string, number> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const userData = { benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder', vorname: 'Max', passwortGeandert: true };
  localStorage.setItem('user', JSON.stringify(userData));

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Sidebar badges={badges} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Sidebar', () => {
  it('rendert Navigationselemente', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tagesstatus')).toBeInTheDocument();
    expect(screen.getByText('Teilnehmer')).toBeInTheDocument();
    expect(screen.getByText('Aufgaben')).toBeInTheDocument();
    expect(screen.getByText('Termine')).toBeInTheDocument();
    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('zeigt Badge-Zahlen an', () => {
    renderSidebar({ aufgaben: 5, termine: 3, notizen: 2, teilnehmer: 1 });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('zeigt Admin-Link nur für Admin', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const userData = { benutzerId: 1, benutzername: 'admin', rolle: 'Admin', vorname: 'Admin', passwortGeandert: true };
    localStorage.setItem('user', JSON.stringify(userData));

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Sidebar badges={{}} />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Benutzer')).toBeInTheDocument();
  });

  it('kein Admin-Link für normale Ausbilder', () => {
    renderSidebar();
    expect(screen.queryByText('Benutzer')).not.toBeInTheDocument();
  });

  it('zeigt Passwort-ändern und Abmelden Buttons', () => {
    renderSidebar();
    expect(screen.getByText('Passwort ändern')).toBeInTheDocument();
    expect(screen.getByText('Abmelden')).toBeInTheDocument();
  });

  it('öffnet Passwort-Modal beim Klick', async () => {
    renderSidebar();
    await userEvent.click(screen.getByText('Passwort ändern'));
    expect(screen.getByText('Altes Passwort')).toBeInTheDocument();
    expect(screen.getByText('Neues Passwort')).toBeInTheDocument();
  });

  it('zeigt Fehler bei leerem altem Passwort', async () => {
    renderSidebar();
    await userEvent.click(screen.getByText('Passwort ändern'));

    const submitBtn = screen.getAllByRole('button', { name: /Passwort ändern/i }).find(b => b.getAttribute('type') === 'submit')!;
    await userEvent.type(screen.getByLabelText('Altes Passwort'), '   ');
    await userEvent.type(screen.getByLabelText('Neues Passwort'), '123456');
    await userEvent.click(submitBtn);

    expect(await screen.findByText('Altes Passwort eingeben')).toBeInTheDocument();
  });

  it('zeigt Fehler bei zu kurzem neuem Passwort', async () => {
    renderSidebar();
    await userEvent.click(screen.getByText('Passwort ändern'));

    const form = within(document.body).getByLabelText('Neues Passwort').closest('form')!;
    await userEvent.type(within(form).getByLabelText('Altes Passwort'), 'alt');
    await userEvent.type(within(form).getByLabelText('Neues Passwort'), 'kurz');
    await userEvent.click(within(form).getByRole('button', { name: /Passwort ändern/i }));

    expect(await screen.findByText('Neues Passwort muss mindestens 6 Zeichen haben')).toBeInTheDocument();
  });

  it('ruft passwortAendern bei gültigen Daten auf', async () => {
    mockPasswortAendern.mockResolvedValue({} as never);

    renderSidebar();
    await userEvent.click(screen.getByText('Passwort ändern'));

    const form = within(document.body).getByLabelText('Neues Passwort').closest('form')!;
    await userEvent.type(within(form).getByLabelText('Altes Passwort'), 'altes');
    await userEvent.type(within(form).getByLabelText('Neues Passwort'), 'neueslang');
    await userEvent.click(within(form).getByRole('button', { name: /Passwort ändern/i }));

    await waitFor(() => {
      expect(mockPasswortAendern).toHaveBeenCalledWith('altes', 'neueslang');
    });

    expect(await screen.findByText('Passwort geändert')).toBeInTheDocument();
  });

  it('zeigt Fehler bei zu kurzem neuem Passwort', async () => {
    renderSidebar();
    await userEvent.click(screen.getByText('Passwort ändern'));

    await userEvent.type(screen.getByLabelText('Altes Passwort'), 'alt');
    await userEvent.type(screen.getByLabelText('Neues Passwort'), 'kurz');

    const submitButtons = screen.getAllByRole('button', { name: /Passwort ändern/i });
    await userEvent.click(submitButtons[1]);

    expect(screen.getByText('Neues Passwort muss mindestens 6 Zeichen haben')).toBeInTheDocument();
  });

  it('ruft passwortAendern bei gültigen Daten auf', async () => {
    mockPasswortAendern.mockResolvedValue({} as never);

    renderSidebar();
    await userEvent.click(screen.getByText('Passwort ändern'));

    await userEvent.type(screen.getByLabelText('Altes Passwort'), 'altes');
    await userEvent.type(screen.getByLabelText('Neues Passwort'), 'neueslang');

    const submitButtons = screen.getAllByRole('button', { name: /Passwort ändern/i });
    await userEvent.click(submitButtons[1]);

    await waitFor(() => {
      expect(mockPasswortAendern).toHaveBeenCalledWith('altes', 'neueslang');
    });

    expect(await screen.findByText('Passwort geändert')).toBeInTheDocument();
  });

  it('zeigt Benutzer-Initialen', () => {
    renderSidebar();
    expect(screen.getByText('MM')).toBeInTheDocument();
  });
});
