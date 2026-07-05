<<<<<<< HEAD
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
=======
import React, { useState } from 'react';
import { Plus, Database, FileText, LayoutGrid, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listKnowledgeBases, createKnowledgeBase } from '../../api/knowledgeBases';
import { useChatStore } from '../../stores/chatStore';

export const KBListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActiveKbId } = useChatStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Fetch KBs
  const { data: kbsData, isLoading } = useQuery({
    queryKey: ['kbs'],
    queryFn: () => listKnowledgeBases(),
  });

  // Mutation to create KB
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => createKnowledgeBase(data),
    onSuccess: (newKb) => {
      queryClient.invalidateQueries({ queryKey: ['kbs'] });
      setActiveKbId(newKb.id);
      navigate(`/knowledge-bases/${newKb.id}`);
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description });
    setName('');
    setDescription('');
    setShowCreateModal(false);
  };

  const kbsList = kbsData?.items || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
            Knowledge Bases
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Configure ingestion sources, parsing logic, and chunk search strategies.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowCreateModal(true)}
          style={{ gap: '8px' }}
        >
          <Plus size={16} /> New Knowledge Base
        </button>
      </div>

      {isLoading ? (
        <div className="card skeleton" style={{ height: '200px' }} />
      ) : kbsList.length === 0 ? (
        <div 
          className="card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '48px', 
            gap: '12px' 
          }}
        >
          <Database size={48} color="var(--text-muted)" />
          <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)' }}>No knowledge bases yet</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Create one to start uploading and querying your documents.
          </span>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ marginTop: '8px' }}>
            Create Knowledge Base
          </button>
        </div>
      ) : (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {kbsList.map((kb) => (
            <div 
              key={kb.id} 
              className="card card-interactive"
              onClick={() => {
                setActiveKbId(kb.id);
                navigate(`/knowledge-bases/${kb.id}`);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Database size={18} color="var(--accent)" />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {kb.name}
                  </span>
                </div>
                <span className={`badge badge-${kb.status}`}>
                  {kb.status.toUpperCase()}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', flex: 1, margin: 0 }}>
                {kb.description || 'No description provided.'}
              </p>

              <div 
                style={{
                  display: 'flex', 
                  gap: '16px', 
                  fontSize: '11px', 
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '12px',
                  marginTop: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={12} />
                  <span>{kb.document_count || 0} documents</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LayoutGrid size={12} />
                  <span>{kb.chunk_count || 0} chunks</span>
                </div>
              </div>
            </div>
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
          ))}
        </div>
      )}

<<<<<<< HEAD
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
=======
      {/* Create Modal */}
      {showCreateModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <form 
            onSubmit={handleCreate}
            className="card page-enter"
            style={{
              width: '440px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '17px', fontWeight: '600' }}>New Knowledge Base</span>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setShowCreateModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal Contracts"
                  className="input"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this knowledge base for?"
                  className="input"
                  style={{ height: '80px', resize: 'none', padding: '8px 12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create KB
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
