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
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-md)', color: '#f2f2f2',
              padding: '6px 10px', fontSize: 'var(--text-sm)', outline: 'none', cursor: 'pointer', minWidth: 200,
            }}
          >
            <option value="" style={{ background: '#1a1a1a', color: '#9a9a9a' }}>Select a knowledge base…</option>
            {kbs.map(kb => <option key={kb.id} value={kb.id} style={{ background: '#1a1a1a', color: '#f2f2f2' }}>{kb.name}</option>)}
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
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radius-md)', color: '#f2f2f2', padding: '10px 12px', height: 38, fontSize: 'var(--text-sm)', outline: 'none' }}
              >
                {strategies.map(s => <option key={s} value={s} style={{ background: '#1a1a1a', color: '#f2f2f2' }}>{s}</option>)}
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
