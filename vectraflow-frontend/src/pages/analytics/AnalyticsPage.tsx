import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { analyticsApi } from '../../api/analytics';
import { formatLatency, formatBytes } from '../../utils/formatters';
import type { CircuitBreakerState } from '../../api/types';

const cbVariant: Record<CircuitBreakerState, 'ready' | 'error' | 'warning'> = {
  closed: 'ready', open: 'error', 'half-open': 'warning',
};

export function AnalyticsPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: () => analyticsApi.getMetrics().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: cbs } = useQuery({
    queryKey: ['circuit-breakers'],
    queryFn: () => analyticsApi.getCircuitBreakers().then(r => r.data),
    refetchInterval: 10000,
  });

  const metricCards = metrics ? [
    ['Knowledge Bases', metrics.total_knowledge_bases],
    ['Documents Indexed', metrics.total_documents],
    ['Chunks Indexed', metrics.total_chunks.toLocaleString()],
    ['Conversations', metrics.total_conversations],
    ['Storage Used', formatBytes(metrics.total_storage_bytes)],
    ['Avg Retrieval', formatLatency(metrics.avg_retrieval_latency_ms)],
    ['Avg Generation', formatLatency(metrics.avg_generation_latency_ms)],
    ['No-Context Rate', `${(metrics.no_context_rate * 100).toFixed(1)}%`],
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Analytics</h1>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {isLoading
          ? [1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} height={80} />)
          : metricCards.map(([label, value]) => (
            <Card key={String(label)}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 8 }}>{label}</p>
              <p style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>{value}</p>
            </Card>
          ))
        }
      </div>

      {/* No historical data note */}
      <Card style={{ background: 'rgba(124,109,255,0.04)', border: '1px solid rgba(124,109,255,0.12)' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Historical charts</strong> — Latency time-series and token usage charts will appear here once your system
          has processed enough requests. All metrics above reflect real data from your knowledge bases and documents.
        </p>
      </Card>

      {/* Circuit breakers */}
      {cbs && cbs.length > 0 && (
        <Card>
          <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 16 }}>Circuit Breakers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cbs.map(cb => (
              <div key={cb.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{cb.name}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {cb.failure_count} failure{cb.failure_count !== 1 ? 's' : ''}
                  {cb.last_failure_at ? ` · last ${new Date(cb.last_failure_at).toLocaleTimeString()}` : ''}
                </span>
                <Badge variant={cbVariant[cb.state as CircuitBreakerState]}>{cb.state}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
