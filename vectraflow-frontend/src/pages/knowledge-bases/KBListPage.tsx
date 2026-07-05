import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { kbApi } from '../../api/knowledgeBases';
import { formatBytes, formatRelativeTime } from '../../utils/formatters';
import type { IndexStatus } from '../../api/types';

const statusVariant = (s: IndexStatus): 'ready' | 'indexing' | 'error' | 'pending' => {
  if (s === 'ready') return 'ready';
  if (s === 'indexing') return 'indexing';
  if (s === 'error' || s === 'degraded') return 'error';
  return 'pending'; // empty, pending
};

export function KBListPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
    refetchInterval: 10000,
  });
  const kbs = Array.isArray(data) ? data : [];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await kbApi.create({ name, description });
      setCreating(false);
      setName(''); setDescription('');
      refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Knowledge Bases</h1>
        <Button onClick={() => setCreating(true)}><Plus size={15} /> New Knowledge Base</Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1,2,3,4].map(i => <Skeleton key={i} height={140} />)}
        </div>
      ) : !kbs.length ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: 'var(--text-md)' }}>No knowledge bases yet</p>
          <p style={{ fontSize: 'var(--text-sm)', marginTop: 8 }}>Create your first knowledge base to start ingesting documents</p>
          <Button onClick={() => setCreating(true)} style={{ marginTop: 20 }}><Plus size={15} /> Create one</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {kbs.map(kb => (
            <Card key={kb.id} interactive onClick={() => navigate(`/knowledge-bases/${kb.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{kb.name}</span>
                <Badge variant={statusVariant(kb.status)}>{kb.status}</Badge>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{kb.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Documents', kb.document_count],
                  ['Chunks', kb.chunk_count.toLocaleString()],
                  ['Storage', formatBytes(kb.storage_bytes)],
                  ['Last indexed', kb.last_ingested_at ? formatRelativeTime(kb.last_ingested_at) : 'Never'],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</p>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{val}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New Knowledge Base">
        <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Legal Documents" required />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What documents will this KB contain?"
              rows={3}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '10px 12px', fontSize: 'var(--text-base)', resize: 'vertical', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !name}>{saving ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
