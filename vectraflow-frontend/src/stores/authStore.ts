import { create } from 'zustand';

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
