import { useState } from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const piiCategories = ['email', 'phone', 'ssn', 'credit_card', 'address', 'name', 'ip_address'];

export function GovernancePage() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(['email', 'phone', 'ssn']));
  const [action, setAction] = useState('redact');
  const [saved, setSaved] = useState(false);

  const toggle = (cat: string) => {
    setEnabled(s => {
      const n = new Set(s);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
    setSaved(false);
  };

  const savePolicy = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

      {/* PII Policy */}
      <Card>
        <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 4 }}>PII Detection Policy</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          Select which PII categories to detect in uploaded documents, and choose what action to take when PII is found.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          {piiCategories.map(cat => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enabled.has(cat)}
                onChange={() => toggle(cat)}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
              />
              <span style={{ fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>{cat.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Action on detection:</label>
          {['redact', 'mask', 'block'].map(a => (
            <button
              key={a}
              onClick={() => { setAction(a); setSaved(false); }}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                background: action === a ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: action === a ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)', fontWeight: 500, transition: 'all 0.15s',
              }}
            >
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button onClick={savePolicy}>Save Policy</Button>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>
              <CheckCircle size={14} /> Saved
            </span>
          )}
        </div>
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
