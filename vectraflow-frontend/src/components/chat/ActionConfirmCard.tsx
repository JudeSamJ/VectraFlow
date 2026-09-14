import { useState } from 'react';
import { ShieldAlert, Check, X, Loader2 } from 'lucide-react';
import type { PendingAction } from '../../stores/chatStore';

interface Props {
  pendingAction: PendingAction;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
}

// Shown under an assistant message whenever the intent-detection routing
// step (see kb_chat.py's sync_chat) staged a D365 action instead of
// answering — the explicit "show the exact action + parameters before
// executing" confirmation step Step 2 requires. Nothing is sent to D365
// until the user clicks Confirm here.
export function ActionConfirmCard({ pendingAction, onConfirm, onCancel }: Props) {
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);

  if (pendingAction.resolved) {
    return (
      <div style={{ marginTop: 10, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        {pendingAction.resolved === 'confirmed' ? 'Action confirmed and sent to D365.' : 'Action cancelled.'}
      </div>
    );
  }

  const run = async (which: 'confirm' | 'cancel', fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(which);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        marginTop: 10, padding: 12, borderRadius: 'var(--radius-md)',
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <ShieldAlert size={14} color="#fbbf24" />
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#fbbf24' }}>
          Confirm before this runs in D365
        </span>
      </div>
      <table style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 10, width: '100%' }}>
        <tbody>
          {Object.entries(pendingAction.parameters).map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '2px 8px 2px 0', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{k}</td>
              <td style={{ padding: '2px 0' }}>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => run('confirm', onConfirm)}
          disabled={busy !== null}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,192,122,0.12)', border: '1px solid rgba(0,192,122,0.3)',
            color: 'var(--accent)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)',
            fontWeight: 600, padding: '5px 10px', cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy === 'confirm' ? <Loader2 size={12} className="spin" /> : <Check size={12} />} Confirm
        </button>
        <button
          onClick={() => run('cancel', onCancel)}
          disabled={busy !== null}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-emphasis)',
            color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)',
            fontWeight: 600, padding: '5px 10px', cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy === 'cancel' ? <Loader2 size={12} className="spin" /> : <X size={12} />} Cancel
        </button>
      </div>
    </div>
  );
}
