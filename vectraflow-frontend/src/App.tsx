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
