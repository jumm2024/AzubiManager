import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import Login from './Login';

vi.mock('../api/client', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn().mockRejectedValue(new Error('no session')),
    passwortAendern: vi.fn(),
  },
}));

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Login', () => {
  it('rendert das Login-Formular', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Benutzername')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Passwort')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anmelden/i })).toBeInTheDocument();
  });

  it('zeigt Fehlermeldung bei leerem Submit nicht (required verhindert)', async () => {
    renderLogin();
    const button = screen.getByRole('button', { name: /Anmelden/i });
    await userEvent.click(button);
    expect(screen.queryByText('Login fehlgeschlagen')).not.toBeInTheDocument();
  });

  it('ruft login bei Submit auf', async () => {
    const { authApi } = await import('../api/client');
    vi.mocked(authApi.login).mockResolvedValue({ data: { benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder' } } as never);

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('Benutzername'), 'max');
    await userEvent.type(screen.getByPlaceholderText('Passwort'), 'geheim');
    await userEvent.click(screen.getByRole('button', { name: /Anmelden/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('max', 'geheim');
    });
  });

  it('zeigt Fehler bei fehlgeschlagenem Login', async () => {
    const { authApi } = await import('../api/client');
    vi.mocked(authApi.login).mockRejectedValue(new Error('Login failed'));

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText('Benutzername'), 'max');
    await userEvent.type(screen.getByPlaceholderText('Passwort'), 'falsch');
    await userEvent.click(screen.getByRole('button', { name: /Anmelden/i }));

    await waitFor(() => {
      expect(screen.getByText('Login fehlgeschlagen')).toBeInTheDocument();
    });
  });
});
