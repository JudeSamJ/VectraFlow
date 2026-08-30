import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { kbApi } from '../../api/knowledgeBases';

export function KBSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: kb, isLoading } = useQuery({
    queryKey: ['kb', id],
    queryFn: () => kbApi.get(id!).then(r => r.data),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!kb) return;
    setName(kb.name);
    setDescription(kb.description ?? '');
  }, [kb]);

  const saveMutation = useMutation({
    mutationFn: () => kbApi.update(id!, { name, description }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      qc.invalidateQueries({ queryKey: ['kb', id] });
      qc.invalidateQueries({ queryKey: ['knowledge-bases'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => kbApi.delete(id!),
    onSuccess: () => navigate('/knowledge-bases'),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton height={32} width={240} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (!kb) return <p style={{ color: 'var(--text-secondary)' }}>Knowledge base not found.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="icon" onClick={() => navigate(`/knowledge-bases/${id}`)}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Settings — {kb.name}</h1>
      </div>

      <Card>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 4 }}>General</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Rename this knowledge base or update its description.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                padding: '10px 12px', fontSize: 'var(--text-base)', resize: 'vertical', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            {saved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>
                <CheckCircle size={14} /> Saved
              </span>
            )}
            {saveMutation.isError && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--status-high)' }}>Failed to save — try again</span>
            )}
          </div>
        </div>
      </Card>

      <Card style={{ borderColor: 'rgba(255,77,77,0.25)' }}>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 4, color: '#FF4D4D' }}>Danger Zone</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Deleting this knowledge base removes its documents and vector data. This can't be undone.
        </p>
        <Button
          variant="destructive"
          onClick={() => { if (confirm(`Delete "${kb.name}"? This cannot be undone.`)) deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
        >
          <Trash2 size={14} /> {deleteMutation.isPending ? 'Deleting…' : 'Delete knowledge base'}
        </Button>
      </Card>
    </div>
  );
}
