import { useMemo, useState } from 'react';
import { ArrowLeft, Filter, ChevronRight, MessageSquare, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { kbApi } from '../../api/knowledgeBases';
import { useKBStore } from '../../stores/kbStore';
import { formatRelativeTime } from '../../utils/formatters';

interface ConversationItem {
  id: string;
  knowledge_base_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function ConversationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setActiveKB } = useKBStore();
  const [showFilters, setShowFilters] = useState(false);
  const [kbFilter, setKbFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () =>
      apiClient.get<ConversationItem[]>('/conversations').then(r => r.data),
  });

  const { data: kbs = [] } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
  });
  const kbNameById = useMemo(
    () => Object.fromEntries(kbs.map(kb => [kb.id, kb.name])),
    [kbs]
  );

  const filtered = conversations.filter(conv => {
    if (kbFilter && conv.knowledge_base_id !== kbFilter) return false;
    if (search && !conv.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openConversation = (conv: ConversationItem) => {
    setActiveKB(conv.knowledge_base_id);
    navigate('/chat', { state: { conversationId: conv.id, kbId: conv.knowledge_base_id } });
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/conversations/${id}`);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters = !!(search || kbFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="icon" onClick={() => navigate(-1)}><ArrowLeft size={16} /></Button>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, flex: 1 }}>History</h1>
        <Button
          variant={showFilters || hasActiveFilters ? 'secondary' : 'icon'}
          onClick={() => setShowFilters(s => !s)}
        >
          <Filter size={16} />
        </Button>
      </div>

      {showFilters && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title…"
            style={{
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-md)', color: '#f2f2f2',
              padding: '8px 12px', fontSize: 'var(--text-sm)', outline: 'none', minWidth: 220,
            }}
          />
          <select
            value={kbFilter}
            onChange={e => setKbFilter(e.target.value)}
            style={{
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-md)', color: '#f2f2f2',
              padding: '8px 12px', fontSize: 'var(--text-sm)', outline: 'none', minWidth: 200, cursor: 'pointer',
            }}
          >
            <option value="" style={{ background: '#1a1a1a' }}>All knowledge bases</option>
            {kbs.map(kb => (
              <option key={kb.id} value={kb.id} style={{ background: '#1a1a1a' }}>{kb.name}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setKbFilter(''); }}>
              <X size={13} /> Clear
            </Button>
          )}
        </div>
      )}

      <p style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {isLoading
          ? 'Loading…'
          : hasActiveFilters
            ? `${filtered.length} of ${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`
            : `${conversations.length} past conversation${conversations.length === 1 ? '' : 's'}`}
      </p>

      {!isLoading && conversations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 'var(--text-sm)' }}>No conversations yet — start chatting to see history here</p>
          <Button variant="secondary" style={{ marginTop: 16 }} onClick={() => navigate('/chat')}>
            Start a conversation
          </Button>
        </div>
      )}

      {!isLoading && conversations.length > 0 && filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: '40px 0' }}>
          No conversations match your filters.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(conv => (
          <Card
            key={conv.id}
            interactive
            onClick={() => openConversation(conv)}
            style={{ display: 'flex', gap: 16, alignItems: 'flex-start', cursor: 'pointer' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{conv.title}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {formatRelativeTime(conv.updated_at)}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 12 }}>
                KB: {kbNameById[conv.knowledge_base_id] ?? `${conv.knowledge_base_id.slice(0, 8)}…`}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); openConversation(conv); }}>
                  Open in Chat <ChevronRight size={13} />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === conv.id}
                  onClick={e => deleteConversation(conv.id, e)}
                >
                  <Trash2 size={13} /> {deletingId === conv.id ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
