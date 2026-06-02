import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import MainLayout from './components/MainLayout';

const Dashboard = lazy(() => import('./components/Dashboard'));
const TeilnehmerListe = lazy(() => import('./components/TeilnehmerListe'));
const AufgabenListe = lazy(() => import('./components/AufgabenListe'));
const NotizenListe = lazy(() => import('./components/NotizenListe'));
const TermineListe = lazy(() => import('./components/TermineListe'));
const TagesstatusListe = lazy(() => import('./components/TagesstatusListe'));
const BenutzerListe = lazy(() => import('./components/BenutzerListe'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense>} />
        <Route path="/teilnehmer" element={<Suspense fallback={<LoadingFallback />}><TeilnehmerListe /></Suspense>} />
        <Route path="/aufgaben" element={<Suspense fallback={<LoadingFallback />}><AufgabenListe /></Suspense>} />
        <Route path="/termine" element={<Suspense fallback={<LoadingFallback />}><TermineListe /></Suspense>} />
        <Route path="/notizen" element={<Suspense fallback={<LoadingFallback />}><NotizenListe /></Suspense>} />
        <Route path="/erinnerungen" element={<Navigate to="/dashboard" />} />
        <Route path="/tagesstatus" element={<Suspense fallback={<LoadingFallback />}><TagesstatusListe /></Suspense>} />
        <Route path="/benutzer" element={<Suspense fallback={<LoadingFallback />}><BenutzerListe /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
    </ErrorBoundary>
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