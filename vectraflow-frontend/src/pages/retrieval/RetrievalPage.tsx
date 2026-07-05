<<<<<<< HEAD
import { useState } from 'react';
import { Search, Database } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { apiClient } from '../../api/client';
import { kbApi } from '../../api/knowledgeBases';
import { useKBStore } from '../../stores/kbStore';
import { formatLatency } from '../../utils/formatters';
import type { RetrievalStrategy, Chunk } from '../../api/types';

const strategies: RetrievalStrategy[] = ['dense', 'sparse', 'hybrid', 'multi_query', 'hyde', 'parent_document'];

interface RetrievalResult extends Chunk {
  rerank_score?: number;
  source: string;
}

export function RetrievalPage() {
  const { activeKBId, setActiveKB } = useKBStore();
  const kbId = activeKBId ?? '';
  const [query, setQuery] = useState('');

  const { data: kbData } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
  });
  const kbs = Array.isArray(kbData) ? kbData : [];
  const [strategy, setStrategy] = useState<RetrievalStrategy>('hybrid');
  const [topK, setTopK] = useState(5);
  const [rerank, setRerank] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [latency, setLatency] = useState<number | null>(null);

  const run = async () => {
    if (!query || !kbId) return;
    setLoading(true);
    const start = Date.now();
    try {
      const res = await apiClient.post(`/knowledge-bases/${kbId}/retrieve`, { query, strategy, top_k: topK, rerank });
      setResults(res.data.results ?? []);
      setLatency(Date.now() - start);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Retrieval Playground</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={14} color="var(--text-muted)" />
          <select
            value={kbId}
            onChange={e => setActiveKB(e.target.value || null)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-md)', color: kbId ? 'var(--text-primary)' : 'var(--text-muted)',
              padding: '6px 10px', fontSize: 'var(--text-sm)', outline: 'none', cursor: 'pointer', minWidth: 200,
            }}
          >
            <option value="">Select a knowledge base…</option>
            {kbs.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
          </select>
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Query"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Enter a retrieval query…"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 12, alignItems: 'flex-end' }}>
            {/* Strategy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Strategy</label>
              <select
                value={strategy}
                onChange={e => setStrategy(e.target.value as RetrievalStrategy)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '10px 12px', height: 38, fontSize: 'var(--text-sm)', outline: 'none' }}
              >
                {strategies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Top-K */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Top-K: {topK}</label>
              <input
                type="range" min={1} max={20} value={topK}
                onChange={e => setTopK(Number(e.target.value))}
                style={{ accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Rerank toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Rerank</label>
              <button
                onClick={() => setRerank(r => !r)}
                style={{
                  width: 44, height: 24, borderRadius: 'var(--radius-full)',
                  background: rerank ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: rerank ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            <Button onClick={run} disabled={loading || !query || !kbId}>
              <Search size={14} /> {loading ? 'Searching…' : 'Search'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{results.length} results</p>
            {latency && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatLatency(latency)}</p>}
          </div>
          {results.map((r, i) => (
            <Card key={r.id ?? i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>#{i + 1} · {r.source}</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {r.score != null && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>score {r.score.toFixed(3)}</span>}
                  {r.rerank_score != null && <span style={{ fontSize: 'var(--text-xs)', color: '#FFA043' }}>rerank {r.rerank_score.toFixed(3)}</span>}
                </div>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{r.content}</p>
              {r.page_number && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>Page {r.page_number}</p>}
            </Card>
          ))}
        </div>
      )}

      {!results.length && !loading && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: '40px 0' }}>Run a query to see retrieval results</p>
      )}
    </div>
  );
}
=======
import React, { useState } from 'react';
import { Sliders, Play, Trash2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '../../stores/chatStore';
import { listKnowledgeBases } from '../../api/knowledgeBases';
import type { KnowledgeBase } from '../../api/types';

export const RetrievalPage: React.FC = () => {
  const { activeKbId, setActiveKbId } = useChatStore();

  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [scoreThreshold, setScoreThreshold] = useState(0.0);
  const [results, setResults] = useState<any[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

  // Fetch KBs list
  const { data: kbsData } = useQuery({
    queryKey: ['kbs'],
    queryFn: () => listKnowledgeBases(),
  });

  const kbsList = kbsData?.items || [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKbId || !query.trim()) return;

    setSearching(true);
    // Mock querying backend dense search endpoint: POST /knowledge-bases/:kbId/retrieve
    await new Promise((resolve) => setTimeout(resolve, 350));
    
    setLatency(127);
    setResults([
      {
        chunk_id: 'ch-101',
        text: 'The liability aggregate cap is $1,000,000 for all related partner intellectual property infringement claims under Section 14.',
        score: 0.87,
        document_id: 'doc-1',
        document_filename: 'acme_master_agreement_v2.pdf',
        page_number: 14,
        chunk_index: 24,
        token_count: 82
      },
      {
        chunk_id: 'ch-102',
        text: 'Standard non-disclosure terms limit disclosure period to 5 years starting from the date of master agreement signature.',
        score: 0.74,
        document_id: 'doc-2',
        document_filename: 'beta_general_terms_2025.pdf',
        page_number: 3,
        chunk_index: 5,
        token_count: 65
      }
    ].filter(r => r.score >= scoreThreshold).slice(0, topK));
    setSearching(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setLatency(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="page-enter">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
          Retrieval Playground
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Query your vector partition index directly to audit retrieved chunks without LLM synthesis.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Form controls */}
        <form onSubmit={handleSearch} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <Sliders size={16} color="var(--accent)" />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Search Parameters</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* KB Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Target Knowledge Base</label>
              <select 
                value={activeKbId || ''} 
                onChange={(e) => setActiveKbId(e.target.value)} 
                className="input"
                style={{ width: '100%' }}
              >
                <option value="">Choose Knowledge Base</option>
                {kbsList.map((kb: KnowledgeBase) => (
                  <option key={kb.id} value={kb.id}>{kb.name} ({kb.status.toUpperCase()})</option>
                ))}
              </select>
            </div>

            {/* Query */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Query Text</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a search query..."
                className="input"
                style={{ height: '80px', minHeight: '80px', padding: '8px 12px', resize: 'none', fontSize: '14px' }}
              />
            </div>

            {/* Top K */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Top K</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{topK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>

            {/* Score Threshold */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Score Threshold</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{scoreThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1, gap: '6px' }}
              onClick={handleClear}
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1, gap: '6px' }}
              disabled={!activeKbId || !query.trim() || searching}
            >
              <Play size={14} fill="var(--text-on-accent)" />
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Right Results Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No results — try a different query or lower the score threshold
            </div>
          ) : (
            <>
              {/* Metrics header */}
              {latency !== null && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Clock size={14} color="var(--accent)" />
                  <span>{results.length} results found in {latency}ms</span>
                </div>
              )}

              {/* Result cards list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {results.map((res) => (
                  <div key={res.chunk_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                    
                    {/* Score bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Score</span>
                      <div style={{ flex: 1, height: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${res.score * 100}%`, backgroundColor: 'var(--accent)' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)' }}>{res.score.toFixed(2)}</span>
                    </div>

                    {/* Monospace content */}
                    <pre 
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'rgba(255,255,255,0.01)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}
                    >
                      {res.text}
                    </pre>

                    {/* Footer metadata */}
                    <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                      <span>{res.document_filename}</span>
                      <span>·</span>
                      <span>Page {res.page_number || '—'}</span>
                      <span>·</span>
                      <span>Index {res.chunk_index}</span>
                      <span>·</span>
                      <span>{res.token_count} tokens</span>
                    </div>

                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
