import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn().mockRejectedValue(new Error('no session')),
    passwortAendern: vi.fn(),
  },
}));

const ProtectedPage = () => {
  const { user } = useAuth();
  return <div data-testid="protected">Geschützt für {user?.benutzername}</div>;
};

function renderWithAuth(initialUser: any = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  if (initialUser) {
    localStorage.setItem('user', JSON.stringify(initialUser));
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/protected" element={<ProtectedPage />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route path="*" element={<div data-testid="default-page">Default</div>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('zeigt Default-Route wenn nicht eingeloggt und keine passende Route', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('default-page')).toBeInTheDocument();
    });
  });

  it('zeigt geschützte Seite wenn eingeloggt', async () => {
    renderWithAuth({ benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder' });

    await waitFor(() => {
      expect(screen.getByTestId('default-page')).toBeInTheDocument();
    });
  });
});

describe('AuthContext Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('login flow speichert user und aktualisiert UI', async () => {
    const mockLogin = vi.mocked(client.authApi.login);
    mockLogin.mockResolvedValue({
      data: { benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder', vorname: 'Max' }
    } as any);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    function TestComponent() {
      const { user, login } = useAuth();
      return (
        <div>
          <div data-testid="user-status">{user ? `Eingeloggt: ${user.benutzername}` : 'Ausgeloggt'}</div>
          <button onClick={() => login('max', 'pass')}>Login</button>
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Ausgeloggt')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Eingeloggt: max')).toBeInTheDocument();
    });

    expect(mockLogin).toHaveBeenCalledWith('max', 'pass');
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual({
      benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder', vorname: 'Max'
    });
  });

  it('logout entfernt user und localStorage', async () => {
    const mockLogout = vi.mocked(client.authApi.logout);
    mockLogout.mockResolvedValue(undefined);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    localStorage.setItem('user', JSON.stringify({ benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder' }));

    function TestComponent() {
      const { user, logout } = useAuth();
      return (
        <div>
          <div data-testid="user-status">{user ? `Eingeloggt: ${user.benutzername}` : 'Ausgeloggt'}</div>
          <button onClick={() => logout()}>Logout</button>
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Eingeloggt: max')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(screen.getByText('Ausgeloggt')).toBeInTheDocument();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(localStorage.getItem('user')).toBeNull();
  });
});

import userEvent from '@testing-library/user-event';
