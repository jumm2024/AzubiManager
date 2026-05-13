import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/client';

interface User {
  benutzerId: number;
  benutzername: string;
  rolle: string;
  vorname?: string;
}

interface AuthContextType {
  user: User | null;
  login: (benutzername: string, passwort: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      authApi.me().then(res => {
        const u = res.data;
        if (u.benutzerId) setUser(u);
      }).catch(() => {
        setUser(null);
        localStorage.removeItem('user');
      });
    }
  }, []);

  const login = async (benutzername: string, passwort: string) => {
    const response = await authApi.login(benutzername, passwort);
    const userData: User = response.data;
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignorieren */ }
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
