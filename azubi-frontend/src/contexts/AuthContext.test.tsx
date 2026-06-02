import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import type { ReactNode } from 'react';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn().mockRejectedValue(new Error('no session')),
    passwortAendern: vi.fn(),
  },
}));

const mockLogin = client.authApi.login as MockedFunction<typeof client.authApi.login>;
const mockLogout = client.authApi.logout as MockedFunction<typeof client.authApi.logout>;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('startet ohne Benutzer', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('startet mit Benutzer aus localStorage', () => {
    const userData = { benutzerId: 1, benutzername: 'test', rolle: 'Ausbilder' };
    localStorage.setItem('user', JSON.stringify(userData));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toEqual(userData);
  });

  it('login setzt Benutzer und speichert in localStorage', async () => {
    const mockUser = { benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder', vorname: 'Max' };
    mockLogin.mockResolvedValue({ data: mockUser } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('max', 'pass');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
  });

  it('login bei Fehler wirft Exception und setzt keinen User', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await expect(result.current.login('max', 'falsch')).rejects.toThrow();
    });

    expect(result.current.user).toBeNull();
  });

  it('logout entfernt Benutzer und räumt localStorage', async () => {
    mockLogin.mockResolvedValue({ data: { benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder' } } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('max', 'pass');
    });

    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('updateUser aktualisiert teilweise', async () => {
    mockLogin.mockResolvedValue({ data: { benutzerId: 1, benutzername: 'max', rolle: 'Ausbilder', passwortGeandert: false } } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('max', 'pass');
    });

    act(() => {
      result.current.updateUser({ passwortGeandert: true });
    });

    expect(result.current.user?.passwortGeandert).toBe(true);

    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored.passwortGeandert).toBe(true);
  });
});
