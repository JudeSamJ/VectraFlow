<<<<<<< HEAD
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
=======
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Database, MessageSquare, Clock, Plus, ArrowRight, FileText } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { listKnowledgeBases } from '../../api/knowledgeBases';
import { listConversations } from '../../api/conversations';
import { useChatStore } from '../../stores/chatStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { setActiveKbId, setActiveConversationId } = useChatStore();

  // Queries
  const { data: kbsData, isLoading: loadingKbs } = useQuery({
    queryKey: ['kbs'],
    queryFn: () => listKnowledgeBases(),
  });

  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => listConversations(),
  });

  // Calculate stats
  const kbsList = kbsData?.items || [];
  const conversationsList = conversationsData?.items || [];

  const totalKBs = kbsData?.total || kbsList.length;
  const totalDocs = kbsList.reduce((sum, kb) => sum + (kb.document_count || 0), 0);
  const totalConversations = conversationsData?.total || conversationsList.length;
  const readyKBs = kbsList.filter((kb) => kb.status === 'ready').length;

  const greetingMessage = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="page-enter">
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {greetingMessage()},
          </span>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
            {user?.full_name || 'VectraFlow User'}
          </h1>
        </div>

        <div 
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            color: 'var(--text-on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/settings')}
        >
          {user ? getInitials(user.full_name) : 'VF'}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Metric Card 1 */}
        <div className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Knowledge Bases</span>
          <span style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {loadingKbs ? '...' : totalKBs}
          </span>
          <Database size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px' }} />
        </div>

        {/* Metric Card 2 */}
        <div className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Documents</span>
          <span style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {loadingKbs ? '...' : totalDocs}
          </span>
          <FileText size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px' }} />
        </div>

        {/* Metric Card 3 */}
        <div className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Conversations</span>
          <span style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {loadingConversations ? '...' : totalConversations}
          </span>
          <MessageSquare size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px' }} />
        </div>

        {/* Metric Card 4 */}
        <div className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ready KBs</span>
          <span style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {loadingKbs ? '...' : readyKBs}
          </span>
          <Clock size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px' }} />
        </div>
      </div>

      {/* Grid of Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Knowledge Bases Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '600' }}>Your Knowledge Bases</h2>
            <Link to="/knowledge-bases" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>View all</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loadingKbs ? (
            <div className="card skeleton" style={{ height: '140px' }} />
          ) : kbsList.length === 0 ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '12px' }}>
              <Database size={32} color="var(--text-muted)" />
              <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Create your first knowledge base</span>
              <button className="btn btn-primary" onClick={() => navigate('/knowledge-bases')} style={{ gap: '6px' }}>
                <Plus size={14} />
                <span>Create KB</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {kbsList.slice(0, 4).map((kb) => (
                <div 
                  key={kb.id} 
                  className="card card-interactive" 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => navigate(`/knowledge-bases/${kb.id}`)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{kb.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {kb.document_count || 0} docs · {formatBytes(kb.storage_bytes || 0)}
                    </span>
                  </div>
                  <span className={`badge badge-${kb.status}`}>{kb.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversations Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '600' }}>Recent Conversations</h2>
            <Link to="/history" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>View all</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loadingConversations ? (
            <div className="card skeleton" style={{ height: '140px' }} />
          ) : conversationsList.length === 0 ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '12px' }}>
              <MessageSquare size={32} color="var(--text-muted)" />
              <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Ask your first question</span>
              <button className="btn btn-primary" onClick={() => navigate('/chat')}>
                <span>Go to Chat</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {conversationsList.slice(0, 5).map((conv) => (
                <div 
                  key={conv.id} 
                  className="card card-interactive" 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => {
                    setActiveKbId(conv.kb_id);
                    setActiveConversationId(conv.id);
                    navigate('/chat');
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {conv.title || 'Untitled conversation'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {conv.kb_name} · {conv.message_count} messages
                    </span>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
}
=======
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
