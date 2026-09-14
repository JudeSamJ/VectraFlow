import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { app } from '@microsoft/teams-js';
import { ChatPage } from './pages/chat/ChatPage';
import { authApi } from './api/auth';
import { useAuthStore } from './stores/authStore';

// Standalone entry point for the Microsoft Teams tab — reuses the existing
// chat UI (ChatPage and everything it composes: MessageBubble, CitationPanel,
// the chat/KB stores, the chat API client) exactly as the main web app does,
// without touching that app's own routing (App.tsx / BrowserRouter) or build
// (vite.config.ts). ChatPage's only router dependency is `useLocation` (used
// to optionally restore a conversation passed via nav state), so a bare
// single-route MemoryRouter is enough context for it here — Teams tabs are
// never deep-linked with that nav state, so it simply starts a fresh chat.

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

type TeamsInitState = 'loading' | 'ready' | 'not-in-teams';

function useTeamsSdk(): TeamsInitState {
  const [state, setState] = useState<TeamsInitState>('loading');

  useEffect(() => {
    let cancelled = false;
    app
      .initialize()
      .then(() => {
        if (cancelled) return;
        setState('ready');
        // Match the Teams theme (default/dark/contrast) so the embedded
        // chat UI doesn't look out of place inside the Teams shell.
        app.getContext().then(ctx => {
          document.documentElement.dataset.teamsTheme = ctx.app.theme;
        });
        app.registerOnThemeChangeHandler(theme => {
          document.documentElement.dataset.teamsTheme = theme;
        });
      })
      .catch(() => {
        // Not actually running inside Teams (e.g. loaded directly in a
        // browser during local development) — still render the tab so it
        // can be exercised standalone.
        if (!cancelled) setState('not-in-teams');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Sign-in gate for the tab. VectraFlow tokens live in this origin's
 * localStorage (see stores/authStore.ts); when the tab is hosted on the
 * same domain as the web app that storage is already shared, so a user who
 * signed in there is recognized here automatically. Otherwise this opens
 * the existing Entra ID login (added in the SSO work) in a new window and
 * waits for that sign-in to land — a minimal first pass, not the full
 * Teams silent-SSO (`authentication.getAuthToken`) flow, which can replace
 * this once the app is registered for it in Microsoft Entra.
 */
function SignInGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  const [waiting, setWaiting] = useState(false);

  // The sign-in window writes vectraflow_token/vectraflow_user to this
  // origin's localStorage on success (same code path the web app's own
  // /auth/callback page uses) but that write happens in a different
  // browsing context, so this window's zustand store won't pick it up on
  // its own — poll localStorage directly and hydrate the store once the
  // token appears.
  useEffect(() => {
    if (!waiting || user) return;
    const id = window.setInterval(() => {
      try {
        const token = localStorage.getItem('vectraflow_token');
        const storedUser = localStorage.getItem('vectraflow_user');
        if (token && storedUser) {
          useAuthStore.getState().setAuth(JSON.parse(storedUser), token);
          setWaiting(false);
        }
      } catch {
        // ignore — keep polling
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [waiting, user]);

  if (user) return <>{children}</>;

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, height: '100vh', padding: 24, textAlign: 'center',
      }}
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: 320 }}>
        Sign in to VectraFlow to start chatting with your knowledge bases from Teams.
      </p>
      <button
        onClick={() => {
          window.open(authApi.entraLoginUrl(), '_blank', 'noopener,noreferrer,width=480,height=640');
          setWaiting(true);
        }}
        style={{
          height: 42, padding: '0 20px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-emphasis)', background: 'var(--brand-primary)',
          color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
        }}
      >
        Sign in with Microsoft
      </button>
      {waiting && (
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
          Waiting for sign-in to complete…
        </p>
      )}
    </div>
  );
}

export function TeamsApp() {
  const initState = useTeamsSdk();

  if (initState === 'loading') return null;

  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <SignInGate>
          <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ChatPage />
          </div>
        </SignInGate>
      </MemoryRouter>
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
