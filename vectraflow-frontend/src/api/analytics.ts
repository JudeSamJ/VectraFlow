import { apiClient } from './client';
import type { AnalyticsMetrics, CircuitBreaker } from './types';

export const analyticsApi = {
  getMetrics: (kbId?: string) =>
    apiClient.get<AnalyticsMetrics>('/analytics/metrics', { params: { kb_id: kbId } }),
  getLatencyTimeseries: (range = '7d') =>
    apiClient.get('/analytics/latency', { params: { range } }),
  getTokenUsage: (range = '7d') =>
    apiClient.get('/analytics/token-usage', { params: { range } }),
  getTopCitedDocuments: () =>
    apiClient.get('/analytics/top-cited'),
  getCircuitBreakers: () =>
    apiClient.get<CircuitBreaker[]>('/admin/circuit-breakers'),
};
