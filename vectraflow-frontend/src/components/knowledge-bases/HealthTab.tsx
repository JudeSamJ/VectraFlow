import { useQuery } from '@tanstack/react-query';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { kbApi } from '../../api/knowledgeBases';
import { documentsApi } from '../../api/documents';
import { analyticsApi } from '../../api/analytics';
import type { DocumentStatus, CircuitBreakerState } from '../../api/types';

interface Props {
  kbId: string;
}

const cbVariant: Record<CircuitBreakerState, 'ready' | 'error' | 'warning'> = {
  closed: 'ready', open: 'error', 'half-open': 'warning',
};

const statusOrder: DocumentStatus[] = ['pending', 'parsing', 'chunking', 'embedding', 'indexing', 'ready', 'failed'];

export function HealthTab({ kbId }: Props) {
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['kb-health', kbId],
    queryFn: () => kbApi.health(kbId).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['documents', kbId],
    queryFn: () => documentsApi.list(kbId).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: breakers = [] } = useQuery({
    queryKey: ['circuit-breakers'],
    queryFn: () => analyticsApi.getCircuitBreakers().then(r => r.data),
    refetchInterval: 15000,
  });

  const statusCounts = statusOrder.reduce((acc, s) => {
    acc[s] = docs.filter(d => d.status === s).length;
    return acc;
  }, {} as Record<DocumentStatus, number>);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Zilliz/Milvus connectivity */}
      <Card>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 12 }}>Vector Store Connectivity</p>
        {healthLoading ? (
          <Skeleton height={60} />
        ) : health ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {health.milvus_reachable
              ? <CheckCircle size={16} color="#00C07A" style={{ flexShrink: 0, marginTop: 2 }} />
              : <AlertTriangle size={16} color="#FF4D4D" style={{ flexShrink: 0, marginTop: 2 }} />}
            <div>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                {health.milvus_reachable
                  ? `Reachable — ${health.milvus_entity_count?.toLocaleString() ?? '?'} entities live in collection`
                  : 'Not reachable right now'}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
                {health.collection}
              </p>
              {health.milvus_error && (
                <p style={{ fontSize: 'var(--text-xs)', color: '#FF4D4D', marginTop: 4 }}>{health.milvus_error}</p>
              )}
              {health.milvus_reachable && health.milvus_entity_count !== health.postgres_chunk_count && (
                <p style={{ fontSize: 'var(--text-xs)', color: '#FFA043', marginTop: 4 }}>
                  Note: Zilliz reports {health.milvus_entity_count?.toLocaleString()} entities, but Postgres
                  tracks {health.postgres_chunk_count.toLocaleString()} ready chunks. This can mean an
                  ingestion is still in flight, a failed ingestion left orphaned vectors — or it can just be
                  Milvus/Zilliz's own lazy-delete lag (a deleted/reindexed document's old vectors briefly
                  still count here until background compaction runs, even though searches already correctly
                  exclude them). Only worth investigating if it persists.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Unable to load.</p>
        )}
      </Card>

      {/* Document status breakdown */}
      <Card>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 12 }}>Document Status Breakdown</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
          {statusOrder.map(s => (
            <div key={s} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s}</p>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: s === 'failed' && statusCounts[s] > 0 ? '#FF4D4D' : 'var(--text-primary)' }}>
                {statusCounts[s]}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* System-wide circuit breakers (shared across all KBs, but relevant here) */}
      <Card>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 4 }}>Dependency Circuit Breakers</p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 12 }}>
          Shared app-wide — not specific to this knowledge base, but these are exactly what retrieval/generation for it depends on
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {breakers.map(b => (
            <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{b.name}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{b.failure_count} failures</span>
                <Badge variant={cbVariant[b.state as CircuitBreakerState]}>{b.state}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
