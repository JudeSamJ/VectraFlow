import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { analyticsApi } from '../../api/analytics';
import { apiClient } from '../../api/client';
import { formatRelativeTime } from '../../utils/formatters';
import type { CircuitBreakerState } from '../../api/types';

const cbVariant: Record<CircuitBreakerState, 'ready' | 'error' | 'warning'> = {
  closed: 'ready', open: 'error', 'half-open': 'warning',
};

interface DLQEntry {
  id: string;
  filename: string;
  knowledge_base_id: string;
  knowledge_base_name: string;
  error_message: string | null;
  created_at: string;
}

export function AdminPage() {
  const qc = useQueryClient();

  const { data: cbs, isLoading: cbsLoading } = useQuery({
    queryKey: ['admin-circuit-breakers'],
    queryFn: () => apiClient.get('/admin/circuit-breakers').then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: dlq, isLoading: dlqLoading, refetch: refetchDLQ } = useQuery({
    queryKey: ['admin-dlq'],
    queryFn: () => apiClient.get<DLQEntry[]>('/admin/dlq').then(r => r.data),
    refetchInterval: 15000,
  });

  const tripCB = useMutation({
    mutationFn: (name: string) => apiClient.post(`/admin/circuit-breakers/${name}/trip`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-circuit-breakers'] }),
  });

  const resetCB = useMutation({
    mutationFn: (name: string) => apiClient.post(`/admin/circuit-breakers/${name}/reset`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-circuit-breakers'] }),
  });

  const retryDLQ = useMutation({
    mutationFn: (id: string) => apiClient.post(`/admin/dlq/${id}/retry`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-dlq'] });
      refetchDLQ();
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Admin</h1>

      {/* Circuit breakers */}
      <Card>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 16 }}>Circuit Breakers</p>
        {cbsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => <Skeleton key={i} height={48} />)}
          </div>
        ) : !cbs?.length ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No circuit breakers configured</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cbs.map((cb: any) => (
              <div key={cb.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{cb.name}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{cb.failure_count} failures</span>
                <Badge variant={cbVariant[cb.state as CircuitBreakerState]}>{cb.state}</Badge>
                <Button
                  variant="icon"
                  onClick={() => tripCB.mutate(cb.name)}
                  title="Trip (force open)"
                  disabled={cb.state === 'open'}
                >
                  <RefreshCw size={13} />
                </Button>
                <Button
                  variant="icon"
                  onClick={() => resetCB.mutate(cb.name)}
                  title="Reset (close)"
                  disabled={cb.state === 'closed'}
                >
                  <RotateCcw size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dead-Letter Queue */}
      <Card>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 16 }}>Failed Documents (DLQ)</p>
        {dlqLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2].map(i => <Skeleton key={i} height={72} />)}
          </div>
        ) : !dlq?.length ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No failed documents — everything is healthy ✓</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dlq.map(entry => (
              <div
                key={entry.id}
                style={{ padding: '12px 14px', background: 'rgba(255,77,77,0.04)', border: '1px solid rgba(255,77,77,0.15)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: 12 }}
              >
                <AlertCircle size={16} color="var(--status-high)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.filename}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    KB: {entry.knowledge_base_name}
                  </p>
                  {entry.error_message && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--status-high)', marginTop: 4, lineHeight: 1.4 }}>
                      {entry.error_message.slice(0, 120)}{entry.error_message.length > 120 ? '…' : ''}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {formatRelativeTime(entry.created_at)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => retryDLQ.mutate(entry.id)}
                    disabled={retryDLQ.isPending}
                  >
                    <RotateCcw size={12} /> Retry
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
