import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import TeilnehmerListe from './components/TeilnehmerListe';
import AufgabenListe from './components/AufgabenListe';
import NotizenListe from './components/NotizenListe';
import TermineListe from './components/TermineListe';
import TagesstatusListe from './components/TagesstatusListe';
import BenutzerListe from './components/BenutzerListe';
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/teilnehmer" element={<TeilnehmerListe />} />
        <Route path="/aufgaben" element={<AufgabenListe />} />
        <Route path="/termine" element={<TermineListe />} />
        <Route path="/notizen" element={<NotizenListe />} />
        <Route path="/erinnerungen" element={<Navigate to="/dashboard" />} />
        <Route path="/tagesstatus" element={<TagesstatusListe />} />
        <Route path="/benutzer" element={<BenutzerListe />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}