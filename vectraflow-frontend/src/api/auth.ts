import { apiClient } from './client';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ access_token: string; refresh_token: string; token_type: string }>(
      '/auth/login', { email, password }
    ),
  me: () =>
    apiClient.get<{ id: string; full_name: string; email: string; role: string }>('/users/me'),
  register: (name: string, email: string, password: string) =>
    apiClient.post('/auth/register', { full_name: name, email, password }),
  logout: () => apiClient.post('/auth/logout'),
};
