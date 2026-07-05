import { X, FileText, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Citation } from '../../stores/chatStore';

interface Props {
  citation: Citation;
  onClose: () => void;
}

export function CitationPanel({ citation, onClose }: Props) {
  return (
    <div
      style={{
        width: 360,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Citation [{citation.index}]</span>
        <Button variant="icon" onClick={onClose}><X size={14} /></Button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Excerpt */}
        <div style={{ background: 'rgba(0,192,122,0.04)', border: '1px solid rgba(0,192,122,0.12)', borderRadius: 'var(--radius-md)', padding: 14 }}>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-primary)' }}>"{citation.excerpt}"</p>
        </div>
        {/* Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <FileText size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{citation.document_name}</span>
          </div>
          {citation.page_number && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Page {citation.page_number}</p>
          )}
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Score: <span style={{ color: 'var(--accent)' }}>{citation.score.toFixed(3)}</span>
          </p>
        </div>
        <Button variant="secondary" size="sm" style={{ alignSelf: 'flex-start' }}>
          <ExternalLink size={12} /> Go to Document
        </Button>
      </div>
    </div>
  );
}
