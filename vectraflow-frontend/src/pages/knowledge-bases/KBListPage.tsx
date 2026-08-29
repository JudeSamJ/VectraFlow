import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [managingPool, setManagingPool] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
    refetchInterval: 10000,
  });
  const kbs = Array.isArray(data) ? data : [];

  const { data: capacity, refetch: refetchCapacity } = useQuery({
    queryKey: ['kb-capacity'],
    queryFn: () => kbApi.capacity().then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: sharedPool, isLoading: poolLoading, refetch: refetchPool } = useQuery({
    queryKey: ['kb-shared-pool'],
    queryFn: () => kbApi.sharedPool().then(r => r.data),
    enabled: managingPool,
  });

  const refreshAll = () => {
    refetch();
    refetchCapacity();
    if (managingPool) refetchPool();
    queryClient.invalidateQueries({ queryKey: ['kb-shared-pool'] });
  };

  const openCreate = () => {
    setCreateError(null);
    if (capacity?.limit_reached) {
      setManagingPool(true);
      return;
    }
    setCreating(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    try {
      await kbApi.create({ name, description });
      setCreating(false);
      setName(''); setDescription('');
      refreshAll();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409) {
        setCreating(false);
        setManagingPool(true);
      } else {
        setCreateError(typeof detail === 'string' ? detail : 'Failed to create knowledge base.');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteFromPool = async (id: string) => {
    setDeletingId(id);
    try {
      await kbApi.delete(id);
      refreshAll();
    } finally {
      setDeletingId(null);
    }
  };

  const capacityLabel = capacity ? `${capacity.count} / ${capacity.limit} knowledge bases used` : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Knowledge Bases</h1>
        <Button onClick={openCreate}><Plus size={15} /> New Knowledge Base</Button>
      </div>

      {capacity && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: capacity.limit_reached ? 'rgba(255,160,67,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${capacity.limit_reached ? 'rgba(255,160,67,0.25)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 12,
            fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
          }}
        >
          {capacity.limit_reached && <AlertTriangle size={15} color="#FFA043" />}
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>{capacityLabel}</strong>
            {' — '}this demo runs on Zilliz Cloud's free tier, which caps the whole app at{' '}
            {capacity.limit} vector collections (shared across every visitor, not per user).
            {capacity.limit_reached
              ? ' Delete a knowledge base below to free up a slot.'
              : ' No self-hosted embedding server is required — embeddings run on Cohere\'s hosted API.'}
          </span>
          {capacity.limit_reached && (
            <Button size="sm" variant="secondary" onClick={() => setManagingPool(true)} style={{ marginLeft: 'auto', flexShrink: 0 }}>
              Free up a slot
            </Button>
          )}
        </div>
      )}

      {capacity && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: capacity.storage_limit_reached ? 'rgba(255,77,77,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${capacity.storage_limit_reached ? 'rgba(255,77,77,0.25)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 24,
            fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
          }}
        >
          {capacity.storage_limit_reached && <AlertTriangle size={15} color="#FF4D4D" />}
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {formatBytes(capacity.storage_used_bytes)} / {formatBytes(capacity.storage_limit_bytes)} storage used
            </strong>
            {' — '}document uploads are stored on Cloudinary, whose free tier only covers{' '}
            {formatBytes(capacity.storage_limit_bytes)} app-wide.
            {capacity.storage_limit_reached
              ? ' Delete some documents or a knowledge base to free up space before uploading more.'
              : ''}
          </span>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1,2,3,4].map(i => <Skeleton key={i} height={140} />)}
        </div>
      ) : !kbs.length ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: 'var(--text-md)' }}>No knowledge bases yet</p>
          <p style={{ fontSize: 'var(--text-sm)', marginTop: 8 }}>Create your first knowledge base to start ingesting documents</p>
          <Button onClick={openCreate} style={{ marginTop: 20 }}><Plus size={15} /> Create one</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {kbs.map(kb => (
            <Card key={kb.id} interactive onClick={() => navigate(`/knowledge-bases/${kb.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{kb.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant={statusVariant(kb.status)}>{kb.status}</Badge>
                  <Button
                    variant="icon"
                    disabled={deletingId === kb.id}
                    onClick={e => { e.stopPropagation(); deleteFromPool(kb.id); }}
                    title="Delete knowledge base"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
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
          {createError && (
            <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 'var(--text-sm)', color: '#FF4D4D' }}>
              {createError}
            </div>
          )}
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

      <Modal open={managingPool} onClose={() => setManagingPool(false)} title="Free-tier limit reached" width={640}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, background: 'rgba(255,160,67,0.08)', border: '1px solid rgba(255,160,67,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={16} color="#FFA043" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              All {capacity?.limit ?? 5} free-tier knowledge base slots are currently in use. This app
              runs on Zilliz Cloud's free tier, which supports only {capacity?.limit ?? 5} vector
              collections in total — shared across everyone trying the demo. Delete any knowledge base
              below (yours or someone else's) to free up a slot, then create your own.
            </span>
          </div>

          {poolLoading ? (
            <Skeleton height={200} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {(sharedPool ?? []).map(entry => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{entry.name}</span>
                      {entry.is_mine && <Badge variant="low">yours</Badge>}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {entry.owner_email} · {entry.document_count} docs · {entry.chunk_count.toLocaleString()} chunks · created {formatRelativeTime(entry.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === entry.id}
                    onClick={() => deleteFromPool(entry.id)}
                  >
                    <Trash2 size={14} /> {deletingId === entry.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              ))}
              {(sharedPool ?? []).length === 0 && !poolLoading && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No knowledge bases found.</p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setManagingPool(false);
                if (!capacity?.limit_reached) setCreating(true);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
