import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Settings, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { Skeleton } from '../../components/ui/Skeleton';
import { kbApi } from '../../api/knowledgeBases';
import { DocumentsTab } from '../../components/documents/DocumentUploadDropzone';
import { formatBytes, formatTokens } from '../../utils/formatters';
import type { IndexStatus } from '../../api/types';

const statusVariant = (s: IndexStatus): 'ready' | 'indexing' | 'error' | 'pending' => {
  if (s === 'ready') return 'ready';
  if (s === 'indexing') return 'indexing';
  if (s === 'error' || s === 'degraded') return 'error';
  return 'pending';
};

const tabs = [
  { label: 'Documents', key: 'documents' },
  { label: 'Pipeline Config', key: 'pipeline' },
  { label: 'Chunks', key: 'chunks' },
  { label: 'Health', key: 'health' },
];

export function KBDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: kb, isLoading } = useQuery({
    queryKey: ['kb', id],
    queryFn: () => kbApi.get(id!).then(r => r.data),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const reindex = useMutation({
    mutationFn: () => kbApi.reindex(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb', id] }),
  });

  const del = useMutation({
    mutationFn: () => kbApi.delete(id!),
    onSuccess: () => navigate('/knowledge-bases'),
  });

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton height={40} width={300} />
      <Skeleton height={80} />
      <Skeleton height={400} />
    </div>
  );

  if (!kb) return <p style={{ color: 'var(--text-secondary)' }}>Knowledge base not found.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, flex: 1 }}>{kb.name}</h1>
        <Badge variant={statusVariant(kb.status)}>{kb.status}</Badge>
        <Button variant="secondary" size="sm" onClick={() => reindex.mutate()} disabled={reindex.isPending}>
          <RefreshCw size={13} /> Reindex
        </Button>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/knowledge-bases/${id}/settings`)}>
          <Settings size={13} /> Settings
        </Button>
        <Button variant="destructive" size="sm" onClick={() => { if (confirm('Delete this knowledge base?')) del.mutate(); }}>
          <Trash2 size={13} /> Delete
        </Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          ['Documents', kb.document_count],
          ['Chunks', kb.chunk_count.toLocaleString()],
          ['Tokens', formatTokens(kb.total_tokens)],
          ['Storage', formatBytes(kb.storage_bytes)],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultKey="documents">
        {activeKey => {
          if (activeKey === 'documents') return <DocumentsTab kbId={id!} />;
          if (activeKey === 'pipeline') return <p style={{ color: 'var(--text-secondary)' }}>Pipeline config editor coming soon.</p>;
          if (activeKey === 'chunks') return <p style={{ color: 'var(--text-secondary)' }}>Chunk inspector coming soon.</p>;
          return <p style={{ color: 'var(--text-secondary)' }}>Health metrics coming soon.</p>;
        }}
      </Tabs>
    </div>
  );
}
