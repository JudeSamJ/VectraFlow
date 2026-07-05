import { apiClient } from './client';
<<<<<<< HEAD

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
=======
import type { User } from './types';

export async function register(data: { email: string; password: string; full_name: string }): Promise<User> {
  const res = await apiClient.post<User>('/auth/register', data);
  return res.data;
}
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
