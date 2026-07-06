import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Play, FlaskConical, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { kbApi } from '../../api/knowledgeBases';
import { apiClient } from '../../api/client';

interface EvalItem {
  question: string;
  ground_truth: string;
}

interface EvalResult {
  question: string;
  ground_truth: string;
  answer: string;
  status: 'pass' | 'fail' | 'error';
}

export function EvaluationPage() {
  const [creating, setCreating] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const [selectedKB, setSelectedKB] = useState('');
  const [question, setQuestion] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [items, setItems] = useState<EvalItem[]>([]);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [results, setResults] = useState<EvalResult[] | null>(null);

  const { data: kbData } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
  });
  const kbs = Array.isArray(kbData) ? kbData : [];

  const addItem = () => {
    if (!question.trim() || !groundTruth.trim()) return;
    setItems(prev => [...prev, { question: question.trim(), ground_truth: groundTruth.trim() }]);
    setQuestion('');
    setGroundTruth('');
  };

  const removeItem = (i: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const runEval = async () => {
    if (!selectedKB || !items.length) return;
    setRunning(true);
    setRunProgress(0);
    setResults(null);

    const evalResults: EvalResult[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const res = await apiClient.post<{ answer: string }>(`/knowledge-bases/${selectedKB}/chat/sync`, {
          query: item.question,
        });
        const answer = res.data.answer ?? '';
        // Simple heuristic: check if key words from ground truth appear in the answer
        const gtWords = item.ground_truth.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const answerLower = answer.toLowerCase();
        const matchedWords = gtWords.filter(w => answerLower.includes(w));
        const matchRatio = gtWords.length > 0 ? matchedWords.length / gtWords.length : 0;
        evalResults.push({
          question: item.question,
          ground_truth: item.ground_truth,
          answer,
          status: matchRatio >= 0.4 ? 'pass' : 'fail',
        });
      } catch {
        evalResults.push({
          question: item.question,
          ground_truth: item.ground_truth,
          answer: 'Failed to get an answer from the knowledge base.',
          status: 'error',
        });
      }
      setRunProgress(i + 1);
    }

    setResults(evalResults);
    setRunning(false);
  };

  const passCount = results?.filter(r => r.status === 'pass').length ?? 0;
  const kbName = kbs.find(k => k.id === selectedKB)?.name ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Evaluation</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
            Test your knowledge bases with custom question sets
          </p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}><Plus size={14} /> New Test Set</Button>}
      </div>

      {/* Empty state */}
      {!items.length && !creating && !results && (
        <Card style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(124,109,255,0.1)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FlaskConical size={24} color="#7C6DFF" />
          </div>
          <p style={{ fontSize: 'var(--text-md)', fontWeight: 500, marginBottom: 8 }}>No evaluation sets yet</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Create a test set with questions and expected answers to evaluate your knowledge base quality.
          </p>
          <Button onClick={() => setCreating(true)}><Plus size={14} /> Create Test Set</Button>
        </Card>
      )}

      {/* Test set builder */}
      {creating && (
        <Card>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 16 }}>New Test Set</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Test set name" value={datasetName} onChange={e => setDatasetName(e.target.value)} placeholder="e.g. Product FAQ Evaluation" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Knowledge Base</label>
              <select
                value={selectedKB}
                onChange={e => setSelectedKB(e.target.value)}
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radius-md)', color: '#f2f2f2', padding: '10px 12px', fontSize: 'var(--text-base)', outline: 'none' }}
              >
                <option value="" style={{ background: '#1a1a1a', color: '#9a9a9a' }}>Select a knowledge base…</option>
                {kbs.map(kb => <option key={kb.id} value={kb.id} style={{ background: '#1a1a1a', color: '#f2f2f2' }}>{kb.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Add Question</p>
              <Input label="Question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="What is …?" />
              <Input label="Expected answer (ground truth)" value={groundTruth} onChange={e => setGroundTruth(e.target.value)} placeholder="The answer you expect from the knowledge base" />
              <Button variant="secondary" size="sm" onClick={addItem} disabled={!question.trim() || !groundTruth.trim()}>
                <Plus size={13} /> Add Question
              </Button>
            </div>

            {items.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {items.length} question{items.length !== 1 ? 's' : ''} added
                </p>
                {items.map((item, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500 }}>Q: {item.question}</p>
                      <p style={{ color: 'var(--text-muted)', marginTop: 2 }}>Expected: {item.ground_truth}</p>
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, flexShrink: 0 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {running && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(124,109,255,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124,109,255,0.15)' }}>
                <FlaskConical size={14} color="#7C6DFF" />
                <p style={{ fontSize: 'var(--text-sm)', color: '#7C6DFF' }}>
                  Running… {runProgress} / {items.length} questions
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={runEval} disabled={!selectedKB || !items.length || running}>
                <Play size={13} /> {running ? `Running ${runProgress}/${items.length}…` : 'Run Evaluation'}
              </Button>
              <Button variant="secondary" onClick={() => { setCreating(false); setItems([]); setResults(null); setDatasetName(''); setSelectedKB(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>
                Results — {kbName || 'Knowledge Base'}
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                {passCount} / {results.length} questions passed
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 'var(--text-sm)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{passCount} passed</span>
              <span style={{ color: 'var(--status-high)', fontWeight: 600 }}>{results.length - passCount} failed</span>
            </div>
          </div>

          {/* Score bar */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{
              height: '100%',
              width: `${(passCount / results.length) * 100}%`,
              background: passCount === results.length ? 'var(--accent)' : passCount === 0 ? 'var(--status-high)' : 'linear-gradient(90deg, var(--accent), #7C6DFF)',
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${r.status === 'pass' ? 'rgba(0,192,122,0.2)' : r.status === 'error' ? 'rgba(255,160,67,0.2)' : 'rgba(255,77,77,0.2)'}`,
                  background: r.status === 'pass' ? 'rgba(0,192,122,0.04)' : r.status === 'error' ? 'rgba(255,160,67,0.04)' : 'rgba(255,77,77,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  {r.status === 'pass'
                    ? <CheckCircle size={15} color="var(--accent)" />
                    : <XCircle size={15} color={r.status === 'error' ? '#FFA043' : 'var(--status-high)'} />
                  }
                  <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', flex: 1 }}>Q{i + 1}: {r.question}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>EXPECTED</p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.ground_truth}</p>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>KB ANSWER</p>
                    <p style={{ fontSize: 'var(--text-sm)', color: r.status === 'error' ? '#FFA043' : 'var(--text-secondary)', lineHeight: 1.5 }}>{r.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => { setResults(null); setCreating(true); }}>
              Edit & Re-run
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setResults(null); setItems([]); setCreating(false); setDatasetName(''); setSelectedKB(''); }}>
              Start New
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
