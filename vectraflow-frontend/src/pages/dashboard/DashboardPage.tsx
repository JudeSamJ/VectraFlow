import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Database, FileText, MessageSquare, HardDrive, Plus, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { kbApi } from '../../api/knowledgeBases';
import { analyticsApi } from '../../api/analytics';
import { useAuthStore } from '../../stores/authStore';
import { formatBytes, formatRelativeTime } from '../../utils/formatters';
import type { IndexStatus } from '../../api/types';

const statusVariant = (s: IndexStatus): 'ready' | 'indexing' | 'error' | 'pending' => {
  if (s === 'ready') return 'ready';
  if (s === 'indexing') return 'indexing';
  if (s === 'error' || s === 'degraded') return 'error';
  return 'pending';
};

export function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: () => analyticsApi.getMetrics().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: kbData, isLoading: kbsLoading } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
    refetchInterval: 30000,
  });
  const kbs = Array.isArray(kbData) ? kbData : [];
  const recentKBs = kbs.slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { label: 'Knowledge Bases', value: metrics?.total_knowledge_bases ?? 0, icon: Database, color: 'var(--accent)', path: '/knowledge-bases' },
    { label: 'Documents', value: metrics?.total_documents ?? 0, icon: FileText, color: '#7C6DFF', path: '/knowledge-bases' },
    { label: 'Chunks Indexed', value: (metrics?.total_chunks ?? 0).toLocaleString(), icon: Database, color: '#FFA043', path: '/knowledge-bases' },
    { label: 'Conversations', value: metrics?.total_conversations ?? 0, icon: MessageSquare, color: '#00C07A', path: '/conversations' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
          {greeting}, {user?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
          Here's an overview of your VectraFlow workspace.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {metricsLoading
          ? [1,2,3,4].map(i => <Skeleton key={i} height={90} />)
          : statCards.map(({ label, value, icon: Icon, color, path }) => (
            <Card key={label} interactive onClick={() => navigate(path)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, background: `${color}18`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={color} />
                </div>
              </div>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{value}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{label}</p>
            </Card>
          ))
        }
      </div>

      {/* Storage */}
      {!metricsLoading && metrics && (
        <Card style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
          <div style={{ width: 36, height: 36, background: 'rgba(255,160,67,0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardDrive size={18} color="#FFA043" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Total Storage Used</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Across all knowledge bases</p>
          </div>
          <p style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{formatBytes(metrics.total_storage_bytes)}</p>
        </Card>
      )}

      {/* Recent knowledge bases */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Your Knowledge Bases</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate('/knowledge-bases')}>
            View all <ArrowRight size={13} />
          </Button>
        </div>

        {kbsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <Skeleton key={i} height={64} />)}
          </div>
        ) : !recentKBs.length ? (
          <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 16 }}>
              You don't have any knowledge bases yet.
            </p>
            <Button onClick={() => navigate('/knowledge-bases')}>
              <Plus size={14} /> Create your first KB
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentKBs.map(kb => (
              <Card key={kb.id} interactive onClick={() => navigate(`/knowledge-bases/${kb.id}`)} style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{kb.name}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {kb.document_count} doc{kb.document_count !== 1 ? 's' : ''} · {kb.chunk_count.toLocaleString()} chunks
                    </p>
                  </div>
                  <Badge variant={statusVariant(kb.status)}>{kb.status}</Badge>
                  {kb.last_ingested_at && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatRelativeTime(kb.last_ingested_at)}
                    </span>
                  )}
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 12 }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'New Knowledge Base', desc: 'Create and start indexing documents', path: '/knowledge-bases', icon: Database },
            { label: 'Start a Chat', desc: 'Ask questions about your documents', path: '/chat', icon: MessageSquare },
            { label: 'View Conversations', desc: 'Browse your chat history', path: '/conversations', icon: MessageSquare },
          ].map(({ label, desc, path, icon: Icon }) => (
            <Card key={label} interactive onClick={() => navigate(path)}>
              <Icon size={18} color="var(--accent)" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
