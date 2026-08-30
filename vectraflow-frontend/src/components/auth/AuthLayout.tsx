import type { ReactNode } from 'react';
import { MessageSquareText, Quote, Database, ShieldCheck } from 'lucide-react';
import { AnimatedBackground } from './AnimatedBackground';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

const features = [
  { icon: MessageSquareText, label: 'Chat with your documents in plain language' },
  { icon: Quote, label: 'Every answer traces back to a real citation' },
  { icon: Database, label: 'Organize sources into separate knowledge bases' },
  { icon: ShieldCheck, label: 'PII detection and audit logging built in' },
];

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left — brand / explainer panel */}
      <div
        className="auth-left-panel"
        style={{
          position: 'relative',
          flex: '0 0 44%',
          minHeight: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
        }}
      >
        <AnimatedBackground position="absolute" />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, background: 'var(--accent)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ color: 'var(--text-on-accent)', fontSize: 18, fontWeight: 700 }}>V</span>
          </div>
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>VectraFlow</span>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Your documents,<br />ready to answer.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginTop: 16, lineHeight: 1.6 }}>
            Upload PDFs, docs, and notes — VectraFlow turns them into a knowledge base you can chat with,
            with every answer backed by a real citation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
            {features.map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 26, height: 26, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    background: 'rgba(0,192,122,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon size={13} color="var(--accent)" />
                </div>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: 'relative', zIndex: 1, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} VectraFlow. All rights reserved.
        </p>
      </div>

      {/* Right — form */}
      <div
        style={{
          flex: 1,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg-primary)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400, animation: 'cardEnter 0.4s ease-out' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 6, marginBottom: 32 }}>{subtitle}</p>

          {children}

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
