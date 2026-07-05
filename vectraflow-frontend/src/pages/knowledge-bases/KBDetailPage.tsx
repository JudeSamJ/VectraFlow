<<<<<<< HEAD
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
=======
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Trash2, 
  X, 
  BarChart,
  HardDrive,
  MessageSquare
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getKnowledgeBase } from '../../api/knowledgeBases';
import { useDropzone } from 'react-dropzone';


export const KBDetailPage: React.FC = () => {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  // Fetch KB details via React Query
  const { data: kb, isLoading: loadingKb } = useQuery({
    queryKey: ['kb', id],
    queryFn: () => getKnowledgeBase(id!),
    enabled: !!id,
  });

  const [activeTab, setActiveTab] = useState<'docs' | 'chunks' | 'stats'>('docs');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  
  // Chunk inspector states
  const [chunkQuery, setChunkQuery] = useState('');
  const [chunkDocFilter, setChunkDocFilter] = useState('');

  // Documents list mock
  const [documents, setDocuments] = useState([
    { id: 'doc-1', name: 'acme_master_agreement_v2.pdf', type: 'PDF', chunks: 14, status: 'ready', size: 1542000, uploadedAt: '2026-06-28 11:30', summary: 'This agreement governs Acme Corp intellectual property limits and indemnification rules.' },
    { id: 'doc-2', name: 'beta_general_terms_2025.pdf', type: 'PDF', chunks: 28, status: 'ready', size: 3450000, uploadedAt: '2026-06-28 11:35', summary: 'General contract terms covering Beta standard NDA, liability boundaries, and security parameters.' },
    { id: 'doc-3', name: 'financial_ledger_projections_q3.docx', type: 'DOCX', chunks: 0, status: 'indexing', size: 540000, uploadedAt: '2026-06-28 11:58', summary: null }
  ]);

  // Drag and drop setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const newDocs = acceptedFiles.map((file, idx) => ({
        id: `doc-${Date.now()}-${idx}`,
        name: file.name,
        type: file.name.split('.').pop()?.toUpperCase() || 'RAW',
        chunks: 0,
        status: 'indexing' as const,
        size: file.size,
        uploadedAt: new Date().toISOString().substring(0, 16).replace('T', ' '),
        summary: null
      }));
      setDocuments((prev) => [...newDocs, ...prev]);

      // Mock completion
      newDocs.forEach((doc) => {
        setTimeout(() => {
          setDocuments((prev) => 
            prev.map((d) => d.id === doc.id ? { ...d, status: 'ready', chunks: Math.floor(Math.random() * 20) + 5, summary: 'Auto-generated summary snippet for ' + d.name } : d)
          );
        }, 5000);
      });
    }
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loadingKb) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }} className="page-enter">
        <div className="skeleton" style={{ height: '32px', width: '200px', margin: '0 auto 16px' }} />
        <div className="skeleton" style={{ height: '140px', width: '100%' }} />
      </div>
    );
  }

  if (!kb) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }} className="page-enter">
        <h2>Knowledge Base not found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/knowledge-bases')} style={{ marginTop: '16px' }}>
          Back to list
        </button>
      </div>
    );
  }

  // Filtered chunks mock
  const mockChunks = [
    { id: 'ch-1', index: 0, docId: 'doc-1', docName: 'acme_master_agreement_v2.pdf', page: 2, text: 'This section details the IP indemnification agreements between Acme Corp and key development partners. Acme agrees to indemnify any and all liability up to $1M.', tokens: 142 },
    { id: 'ch-2', index: 1, docId: 'doc-1', docName: 'acme_master_agreement_v2.pdf', page: 3, text: 'NDAs and third party information security checks. All contractors must verify standard parameters before code deployments.', tokens: 110 },
    { id: 'ch-3', index: 0, docId: 'doc-2', docName: 'beta_general_terms_2025.pdf', page: 1, text: 'Section 4: Limitation of liability. Beta liability is limited to double the annual transaction amount.', tokens: 94 }
  ].filter(c => {
    if (chunkDocFilter && c.docId !== chunkDocFilter) return false;
    if (chunkQuery && !c.text.toLowerCase().includes(chunkQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="page-enter">
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-icon" onClick={() => navigate('/knowledge-bases')} style={{ border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '600' }}>{kb.name}</h1>
              <span className={`badge badge-${kb.status}`}>{kb.status.toUpperCase()}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              {kb.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: '24px' }}>
        {(['docs', 'chunks', 'stats'] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              paddingBottom: '10px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {tab === 'docs' ? 'Documents' : tab === 'chunks' ? 'Chunks' : 'Stats'}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Drag & Drop Upload */}
          <div 
            {...getRootProps()} 
            style={{
              border: isDragActive ? '2px dashed var(--accent)' : '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              textAlign: 'center',
              backgroundColor: isDragActive ? 'var(--accent-subtle)' : 'rgba(255, 255, 255, 0.01)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <input {...getInputProps()} />
            <Upload size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Drop files here or click to upload
            </p>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
              PDF, DOCX, TXT, MD — max 50MB per file (Dense Vector search recursively chunked)
            </span>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Name</th>
                  <th style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Type</th>
                  <th style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Chunks</th>
                  <th style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Size</th>
                  <th style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Uploaded</th>
                  <th style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr 
                    key={doc.id} 
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setSelectedDoc(doc)}
                    className="card-interactive"
                  >
                    <td style={{ padding: '14px 20px', fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="var(--accent)" />
                        <span>{doc.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {doc.type}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge badge-${doc.status}`}>
                        {doc.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '15px', color: 'var(--text-secondary)' }}>
                      {doc.chunks || '—'}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatBytes(doc.size)}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {doc.uploadedAt}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button 
                        className="btn-icon btn-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chunks Tab */}
      {activeTab === 'chunks' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Search chunks text content..." 
              value={chunkQuery}
              onChange={(e) => setChunkQuery(e.target.value)}
              className="input" 
              style={{ flex: 1 }} 
            />
            
            <select
              value={chunkDocFilter}
              onChange={(e) => setChunkDocFilter(e.target.value)}
              className="input"
              style={{ width: '220px' }}
            >
              <option value="">All Documents</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockChunks.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No chunks matched your search parameters.
              </div>
            ) : (
              mockChunks.map((chunk) => (
                <div 
                  key={chunk.id} 
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Index: {chunk.index} | Page: {chunk.page} | Tokens: {chunk.tokens}</span>
                    <span style={{ color: 'var(--accent)' }}>{chunk.docName}</span>
                  </div>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {chunk.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Document Status Counts */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <BarChart size={18} color="var(--accent)" />
              <span style={{ fontSize: '15px', fontWeight: '600' }}>Document Processing Status</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Ready</span>
                  <span style={{ fontWeight: '600', color: 'var(--status-ready)' }}>2 (67%)</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '67%', backgroundColor: 'var(--status-ready)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Indexing</span>
                  <span style={{ fontWeight: '600', color: 'var(--status-indexing)' }}>1 (33%)</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '33%', backgroundColor: 'var(--status-indexing)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Failed</span>
                  <span style={{ fontWeight: '600', color: 'var(--status-error)' }}>0 (0%)</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '0%', backgroundColor: 'var(--status-error)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Storage & Activity card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <HardDrive size={24} color="var(--accent)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Storage Footprint</span>
                <span style={{ fontSize: '20px', fontWeight: '600' }}>5.53 MB</span>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <MessageSquare size={24} color="var(--accent)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Conversations Engaged</span>
                <span style={{ fontSize: '20px', fontWeight: '600' }}>4 Conversations</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Drawer: Document Info Drawer */}
      {selectedDoc && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '360px',
            height: '100%',
            backgroundColor: 'var(--bg-elevated)',
            borderLeft: '1px solid var(--border-strong)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 150,
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            animation: 'drawer-in 200ms ease-out'
          }}
        >
          {/* Header */}
          <div 
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent)" />
              <span style={{ fontSize: '15px', fontWeight: '600' }}>Document Details</span>
            </div>
            <button className="btn-icon" onClick={() => setSelectedDoc(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Name</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedDoc.name}</span>
            </div>

            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Type</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedDoc.type}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Chunks</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedDoc.chunks || '—'}</span>
              </div>
            </div>

            {/* Document Ingestion Summary */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SUMMARY</span>
              <div 
                style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)', 
                  lineHeight: '1.5',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {selectedDoc.summary ? selectedDoc.summary : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="skeleton" style={{ height: '12px', width: '100%' }} />
                    <div className="skeleton" style={{ height: '12px', width: '80%' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
