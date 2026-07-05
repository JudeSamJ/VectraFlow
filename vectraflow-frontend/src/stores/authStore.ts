import { create } from 'zustand';
<<<<<<< HEAD

interface User {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

function loadFromStorage(): { user: User | null; accessToken: string | null } {
  try {
    const token = localStorage.getItem('vectraflow_token');
    const user = localStorage.getItem('vectraflow_user');
    if (token && user) {
      (window as any).__vectraflow_token = token;
      return { user: JSON.parse(user), accessToken: token };
    }
  } catch {}
  return { user: null, accessToken: null };
}

export const useAuthStore = create<AuthState>(set => ({
  ...loadFromStorage(),
  setAuth: (user, accessToken) => {
    localStorage.setItem('vectraflow_token', accessToken);
    localStorage.setItem('vectraflow_user', JSON.stringify(user));
    (window as any).__vectraflow_token = accessToken;
    set({ user, accessToken });
  },
  clearAuth: () => {
    localStorage.removeItem('vectraflow_token');
    localStorage.removeItem('vectraflow_user');
    (window as any).__vectraflow_token = null;
    set({ user: null, accessToken: null });
  },
}));
=======
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { User } from '../api/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

// Plain axios instance (no interceptors) so auth calls never recurse into the
// refresh-retry logic in api/client.ts.
const rawClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const { data } = await rawClient.post('/auth/login', { email, password });
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
        });
        const me = await rawClient.get('/users/me', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        set({ user: me.data });
      },

      logout: async () => {
        const token = get().accessToken;
        try {
          if (token) {
            await rawClient.post(
              '/auth/logout',
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        } catch {
          // ignore logout failures, clear local state regardless
        }
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
      },

      refresh: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) throw new Error('No refresh token available');
        const { data } = await rawClient.post('/auth/refresh', { refresh_token: refreshToken });
        set({ accessToken: data.access_token });
        return data.access_token as string;
      },

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'vectraflow-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
