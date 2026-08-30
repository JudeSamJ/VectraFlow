import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { Message, Citation } from '../../stores/chatStore';

interface Props {
  message: Message;
  onCitationClick: (c: Citation) => void;
}

// Turn bracket citation markers like [1] into markdown links pointing at a
// synthetic "citation:1" href, so ReactMarkdown's own `a` renderer can
// intercept them as clickable chips — everything else renders as normal
// markdown (bold, italics, lists, code blocks, etc.) instead of raw text.
function linkifyCitations(content: string): string {
  return content.replace(/\[(\d+)\]/g, (match, num) => `[${match}](citation:${num})`);
}

const codeFont = "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace";

function buildComponents(citations: Citation[], onCitationClick: (c: Citation) => void): Components {
  return {
    p: ({ children }) => <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>{children}</p>,
    strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
    ul: ({ children }) => <ul style={{ margin: '0 0 10px', paddingLeft: 22, lineHeight: 1.6 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: '0 0 10px', paddingLeft: 22, lineHeight: 1.6 }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
    h1: ({ children }) => <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '4px 0 10px' }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '4px 0 8px' }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: '4px 0 8px' }}>{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote style={{
        margin: '0 0 10px', paddingLeft: 12,
        borderLeft: '3px solid var(--border-emphasis)',
        color: 'var(--text-secondary)',
      }}>
        {children}
      </blockquote>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = /language-/.test(className || '');
      if (isBlock) {
        return (
          <code
            className={className}
            style={{ fontFamily: codeFont, fontSize: 'var(--text-sm)' }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          style={{
            fontFamily: codeFont, fontSize: '0.9em',
            background: 'rgba(255,255,255,0.08)', borderRadius: 4,
            padding: '1px 5px',
          }}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre style={{
        background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-md)', padding: '12px 14px',
        overflowX: 'auto', margin: '0 0 10px',
      }}>
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '0 0 10px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 'var(--text-sm)' }}>{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-default)' }}>{children}</td>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith('citation:')) {
        const idx = parseInt(href.slice('citation:'.length), 10);
        const citation = citations.find(c => c.index === idx);
        if (!citation) return <span>{children}</span>;
        return (
          <span
            onClick={() => onCitationClick(citation)}
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
            {children}
          </span>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
          {children}
        </a>
      );
    },
  };
}

export function MessageBubble({ message, onCitationClick }: Props) {
  const isUser = message.role === 'user';
  const citations = message.citations ?? [];

  const components = useMemo(
    () => buildComponents(citations, onCitationClick),
    [citations, onCitationClick]
  );

  const content = useMemo(() => {
    if (isUser) return <span>{message.content}</span>;
    const source = citations.length ? linkifyCitations(message.content) : message.content;
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    );
  }, [message.content, citations, isUser, components]);

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
