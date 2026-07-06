import { useState, useEffect } from 'react';
import { Download, CheckCircle, Shield } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { kbApi } from '../../api/knowledgeBases';
import { apiClient } from '../../api/client';

const piiCategories = ['email', 'phone', 'ssn', 'credit_card', 'address', 'name', 'ip_address'];

// Maps frontend labels to backend PIIAction enum values
const actionMap: Record<string, string> = {
  redact: 'redact_before_send',
  block:  'block_ingestion',
  flag:   'flag_only',
};
const reverseActionMap: Record<string, string> = {
  redact_before_send: 'redact',
  block_ingestion:    'block',
  flag_only:          'flag',
};

export function GovernancePage() {
  const [selectedKB, setSelectedKB] = useState('');
  const [enabled, setEnabled] = useState<Set<string>>(new Set(['email', 'phone', 'ssn']));
  const [action, setAction] = useState('redact');
  const [saved, setSaved] = useState(false);

  const { data: kbData } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => kbApi.list().then(r => r.data),
  });
  const kbs = Array.isArray(kbData) ? kbData : [];

  // Auto-select first KB if none selected
  useEffect(() => {
    if (!selectedKB && kbs.length > 0) setSelectedKB(kbs[0].id);
  }, [kbs, selectedKB]);

  // Load existing policy for the selected KB
  const { data: policy, isLoading: policyLoading } = useQuery({
    queryKey: ['pii-policy', selectedKB],
    queryFn: () => apiClient.get(`/knowledge-bases/${selectedKB}/governance/pii-policy`).then(r => r.data),
    enabled: !!selectedKB,
  });

  // Sync local state when policy loads
  useEffect(() => {
    if (!policy) return;
    setEnabled(new Set(policy.detect_categories ?? []));
    setAction(reverseActionMap[policy.action] ?? 'redact');
    setSaved(false);
  }, [policy]);

  const saveMutation = useMutation({
    mutationFn: () => apiClient.put(`/knowledge-bases/${selectedKB}/governance/pii-policy`, {
      id: selectedKB,
      knowledge_base_id: selectedKB,
      detect_categories: Array.from(enabled),
      action: actionMap[action] ?? 'redact_before_send',
    }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggle = (cat: string) => {
    setEnabled(s => {
      const n = new Set(s);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
    setSaved(false);
  };

  const exportLog = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), message: 'No audit log entries yet.' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Governance & PII</h1>

      {/* KB selector */}
      <Card style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={16} color="var(--accent)" />
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, flex: 1 }}>Applying policy to:</p>
          <select
            value={selectedKB}
            onChange={e => { setSelectedKB(e.target.value); setSaved(false); }}
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radius-md)', color: '#f2f2f2', padding: '6px 10px', fontSize: 'var(--text-sm)', outline: 'none', minWidth: 200 }}
          >
            <option value="" style={{ background: '#1a1a1a', color: '#9a9a9a' }}>Select a knowledge base…</option>
            {kbs.map(kb => <option key={kb.id} value={kb.id} style={{ background: '#1a1a1a', color: '#f2f2f2' }}>{kb.name}</option>)}
          </select>
        </div>
      </Card>

      {/* PII Policy */}
      <Card>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 4 }}>PII Detection Policy</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          Select which PII categories to detect in documents for this knowledge base, and choose what action to take when PII is found.
        </p>

        {policyLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={32} />
            <Skeleton height={32} width={300} />
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
              {piiCategories.map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: selectedKB ? 'pointer' : 'not-allowed', opacity: selectedKB ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={enabled.has(cat)}
                    onChange={() => toggle(cat)}
                    disabled={!selectedKB}
                    style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>{cat.replace('_', ' ')}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Action on detection:</label>
              {[
                { key: 'redact', label: 'Redact' },
                { key: 'block',  label: 'Block ingestion' },
                { key: 'flag',   label: 'Flag only' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setAction(key); setSaved(false); }}
                  disabled={!selectedKB}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: selectedKB ? 'pointer' : 'not-allowed',
                    background: action === key ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                    color: action === key ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    fontSize: 'var(--text-sm)', fontWeight: 500, transition: 'all 0.15s', opacity: selectedKB ? 1 : 0.5,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!selectedKB || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save Policy'}
              </Button>
              {saved && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>
                  <CheckCircle size={14} /> Saved
                </span>
              )}
              {saveMutation.isError && (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--status-high)' }}>
                  Failed to save — try again
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Audit Log */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>Audit Log</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              All document uploads, chat queries, and admin actions
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={exportLog}><Download size={13} /> Export</Button>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-default)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Audit log persistence is not yet enabled.</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
            Once enabled, all actions across your workspace will be recorded here.
          </p>
        </div>
      </Card>
    </div>
  );
}
