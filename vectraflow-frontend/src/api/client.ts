import axios from "axios";
import { useAuthStore } from "../stores/authStore";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = axios
          .post("/api/v1/auth/refresh", {}, { withCredentials: true })
          .then((r) => r.data.access_token)
          .finally(() => {
            refreshing = null;
          });
      }
      try {
        const token = await refreshing;
        const { user } = useAuthStore.getState();
        if (user) useAuthStore.getState().setAuth(user, token);
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().clearAuth();
      }
    }
    return Promise.reject(error);
  },
);
