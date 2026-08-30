import { apiClient, apiBaseUrl } from './client';

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
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<{ message: string }>('/auth/reset-password', { token, new_password: newPassword }),
  // Full-page redirects, not XHR — OAuth requires an actual browser
  // navigation to the provider's consent screen.
  googleLoginUrl: () => `${apiBaseUrl}/auth/google/login`,
  githubLoginUrl: () => `${apiBaseUrl}/auth/github/login`,
};
