<<<<<<< HEAD
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { KBListPage } from './pages/knowledge-bases/KBListPage';
import { KBDetailPage } from './pages/knowledge-bases/KBDetailPage';
import { ChatPage } from './pages/chat/ChatPage';
import { ConversationsPage } from './pages/conversations/ConversationsPage';
import { RetrievalPage } from './pages/retrieval/RetrievalPage';
import { EvaluationPage } from './pages/evaluation/EvaluationPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { GovernancePage } from './pages/governance/GovernancePage';
import { AdminPage } from './pages/admin/AdminPage';
import { useAuthStore } from './stores/authStore';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="knowledge-bases" element={<KBListPage />} />
            <Route path="knowledge-bases/:id" element={<KBDetailPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="retrieval" element={<RetrievalPage />} />
            <Route path="evaluation" element={<EvaluationPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="governance" element={<GovernancePage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-emphasis)',
            color: 'var(--text-primary)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
=======
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './stores/authStore';
import { Toaster } from 'sonner';

// Lazy loaded page imports
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const KBListPage = lazy(() => import('./pages/knowledge-bases/KBListPage').then(m => ({ default: m.KBListPage })));
const KBDetailPage = lazy(() => import('./pages/knowledge-bases/KBDetailPage').then(m => ({ default: m.KBDetailPage })));
const ChatPage = lazy(() => import('./pages/chat/ChatPage').then(m => ({ default: m.ChatPage })));
const ConversationsPage = lazy(() => import('./pages/conversations/ConversationsPage').then(m => ({ default: m.ConversationsPage })));
const RetrievalPage = lazy(() => import('./pages/retrieval/RetrievalPage').then(m => ({ default: m.RetrievalPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Loading spinner placeholder
const PageLoading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', minHeight: '300px' }}>
    <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.accessToken);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Anonymous route wrapper (redirects to home if logged in)
const AnonymousRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.accessToken);
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster theme="dark" closeButton />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Full-screen auth pages */}
          <Route 
            path="/login" 
            element={
              <AnonymousRoute>
                <LoginPage />
              </AnonymousRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <AnonymousRoute>
                <RegisterPage />
              </AnonymousRoute>
            } 
          />

          {/* Application routes wrapped in AppShell and ProtectedRoute */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <Routes>
                    <Route path="" element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="knowledge-bases" element={<KBListPage />} />
                    <Route path="knowledge-bases/:id" element={<KBDetailPage />} />
                    <Route path="history" element={<ConversationsPage />} />
                    <Route path="playground" element={<RetrievalPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
