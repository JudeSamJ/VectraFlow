import { useState, useEffect } from 'react';
import { Download, CheckCircle, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { kbApi } from '../../api/knowledgeBases';
import { apiClient } from '../../api/client';
import { formatRelativeTime } from '../../utils/formatters';

interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  detail: Record<string, unknown> | null;
  user_email: string | null;
  created_at: string;
}

function actionLabel(action: string): string {
  return action
    .split('.')
    .join(' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

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
  const qc = useQueryClient();
  const [selectedKB, setSelectedKB] = useState('');
  const [enabled, setEnabled] = useState<Set<string>>(new Set(['email', 'phone', 'ssn']));
  const [action, setAction] = useState('redact');
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

  // Audit log — first page, refetched whenever the selected KB changes
  const {
    data: firstPage,
    isLoading: auditLoading,
    isFetching: auditFetching,
  } = useQuery({
    queryKey: ['audit-log', selectedKB],
    queryFn: () =>
      apiClient
        .get(`/knowledge-bases/${selectedKB}/governance/audit-log`, { params: { limit: 25 } })
        .then(r => r.data as { records: AuditLogEntry[]; next_cursor: string | null }),
    enabled: !!selectedKB,
  });

  useEffect(() => {
    if (!firstPage) return;
    setEntries(firstPage.records);
    setCursor(firstPage.next_cursor);
  }, [firstPage]);

  const loadMore = async () => {
    if (!cursor || !selectedKB) return;
    const res = await apiClient.get(`/knowledge-bases/${selectedKB}/governance/audit-log`, {
      params: { limit: 25, cursor },
    });
    setEntries(prev => [...prev, ...res.data.records]);
    setCursor(res.data.next_cursor);
  };

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
      qc.invalidateQueries({ queryKey: ['audit-log', selectedKB] });
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

  const exportLog = async () => {
    if (!selectedKB) return;
    setExporting(true);
    try {
      const res = await apiClient.post(
        `/knowledge-bases/${selectedKB}/governance/audit-log/export`,
        null,
        { params: { format: 'csv' }, responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${selectedKB}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Governance & PII</h1>

      {/* KB selector */}
      <Card style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Shield size={16} color="var(--accent)" />
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, flex: 1 }}>Applying policy to:</p>
          <select
            value={selectedKB}
            onChange={e => { setSelectedKB(e.target.value); setSaved(false); }}
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radius-md)', color: '#f2f2f2', padding: '6px 10px', fontSize: 'var(--text-sm)', outline: 'none', minWidth: 200, flex: '1 1 200px' }}
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>Audit Log</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              Document uploads/deletes, chat queries, and admin actions for this knowledge base
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={exportLog} disabled={!selectedKB || exporting}>
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export'}
          </Button>
        </div>

        {!selectedKB ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
            Select a knowledge base above to see its audit log.
          </p>
        ) : auditLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} height={36} />)}
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-default)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No activity recorded yet for this knowledge base.</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
              Upload a document or send a chat message to see entries appear here.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, minWidth: 180 }}>
                    {actionLabel(entry.action)}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flex: 1 }}>
                    {entry.resource_type && entry.resource_id
                      ? `${entry.resource_type} · ${entry.resource_id.slice(0, 8)}…`
                      : ''}
                    {entry.detail && typeof entry.detail.query === 'string' ? ` — "${entry.detail.query}"` : ''}
                    {entry.detail && typeof entry.detail.filename === 'string' ? ` — ${entry.detail.filename}` : ''}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {entry.user_email ?? 'system'}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', minWidth: 90, textAlign: 'right' }}>
                    {formatRelativeTime(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
            {cursor && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Button variant="secondary" size="sm" onClick={loadMore} disabled={auditFetching}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
