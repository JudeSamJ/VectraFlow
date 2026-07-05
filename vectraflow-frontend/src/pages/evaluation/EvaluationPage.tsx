import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Play, FlaskConical } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { kbApi } from '../../api/knowledgeBases';
import { apiClient } from '../../api/client';

export function EvaluationPage() {
  const [creating, setCreating] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const [selectedKB, setSelectedKB] = useState('');
  const [question, setQuestion] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [items, setItems] = useState<{ question: string; ground_truth: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ kb: string; question: string; answer: string } | null>(null);

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

  const runEval = async () => {
    if (!selectedKB || !items.length) return;
    setRunning(true);
    setRunResult(null);
    try {
      const first = items[0];
      const res = await apiClient.post<{ answer: string }>(`/knowledge-bases/${selectedKB}/chat/sync`, {
        query: first.question,
      });
      const kb = kbs.find(k => k.id === selectedKB);
      setRunResult({ kb: kb?.name ?? selectedKB, question: first.question, answer: res.data.answer });
    } catch {
      setRunResult({ kb: '', question: items[0].question, answer: 'Failed to get an answer from the knowledge base.' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Evaluation</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
            Test your knowledge bases with custom question sets
          </p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus size={14} /> New Test Set</Button>
      </div>

      {/* No test sets yet */}
      {!items.length && !creating && (
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
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', color: selectedKB ? 'var(--text-primary)' : 'var(--text-muted)', padding: '10px 12px', fontSize: 'var(--text-base)', outline: 'none' }}
              >
                <option value="">Select a knowledge base…</option>
                {kbs.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Add Question</p>
              <Input label="Question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="What is …?" />
              <Input label="Expected answer (ground truth)" value={groundTruth} onChange={e => setGroundTruth(e.target.value)} placeholder="The expected answer to verify against" />
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
                  <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
                    <p style={{ fontWeight: 500 }}>Q: {item.question}</p>
                    <p style={{ color: 'var(--text-muted)', marginTop: 2 }}>A: {item.ground_truth}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                onClick={runEval}
                disabled={!selectedKB || !items.length || running}
              >
                <Play size={13} /> {running ? 'Running…' : 'Run Evaluation'}
              </Button>
              <Button variant="secondary" onClick={() => { setCreating(false); setItems([]); setRunResult(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Run result */}
      {runResult && (
        <Card style={{ background: 'rgba(0,192,122,0.04)', border: '1px solid rgba(0,192,122,0.15)' }}>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 12 }}>Evaluation Result — {runResult.kb}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>QUESTION</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{runResult.question}</p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>ANSWER FROM KB</p>
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{runResult.answer}</p>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
