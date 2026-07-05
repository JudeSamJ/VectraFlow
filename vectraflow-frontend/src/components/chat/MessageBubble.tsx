import { useMemo } from 'react';
import type { Message, Citation } from '../../stores/chatStore';

interface Props {
  message: Message;
  onCitationClick: (c: Citation) => void;
}

function renderWithCitations(content: string, citations: Citation[], onClick: (c: Citation) => void) {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const idx = parseInt(match[1]);
      const citation = citations.find(c => c.index === idx);
      if (citation) {
        return (
          <span
            key={i}
            onClick={() => onClick(citation)}
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'rgba(0,192,122,0.08)', border: '1px solid rgba(0,192,122,0.2)',
              color: 'var(--accent)', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)', padding: '2px 6px',
              cursor: 'pointer', margin: '0 2px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,192,122,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,192,122,0.08)'; }}
          >
            {part}
          </span>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export function MessageBubble({ message, onCitationClick }: Props) {
  const isUser = message.role === 'user';

  const content = useMemo(() => {
    if (isUser || !message.citations?.length) return <span>{message.content}</span>;
    return <>{renderWithCitations(message.content, message.citations, onCitationClick)}</>;
  }, [message.content, message.citations, isUser, onCitationClick]);

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: isUser ? '80%' : '90%',
          padding: '12px 16px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? 'rgba(0,192,122,0.08)' : 'rgba(255,255,255,0.03)',
          border: isUser ? '1px solid rgba(0,192,122,0.12)' : '1px solid rgba(255,255,255,0.07)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.6,
          animation: 'fadeSlideIn 0.2s ease-out',
        }}
      >
        {message.isStreaming && !message.content ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--text-muted)',
                  animation: `typing-dot 1.2s ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        ) : content}
      </div>
    </div>
  );
}
