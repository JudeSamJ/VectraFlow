import type { ReactNode } from 'react';
import { MessageSquareText, Quote, Database } from 'lucide-react';
import { AnimatedBackground } from './AnimatedBackground';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

const pills = [
  { icon: MessageSquareText, label: 'Retrieval-augmented chat' },
  { icon: Quote, label: 'Citation tracing' },
  { icon: Database, label: 'Multi-KB workspaces' },
];

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AnimatedBackground />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52, height: 52, background: 'var(--accent)', borderRadius: 14,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 18, animation: 'logoGlow 3s ease-in-out infinite',
            }}
          >
            <span style={{ color: 'var(--text-on-accent)', fontSize: 26, fontWeight: 700 }}>V</span>
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 8 }}>{subtitle}</p>
        </div>

        <div
          style={{
            background: 'rgba(20,20,20,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-emphasis)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6)',
            animation: 'cardEnter 0.4s ease-out',
          }}
        >
          {children}
        </div>

        <p style={{ textAlign: 'center', marginTop: 22, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {footer}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 28 }}>
          {pills.map(({ icon: Icon, label }) => (
            <div
              key={label}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-full)', padding: '6px 12px',
                fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
              }}
            >
              <Icon size={12} color="var(--accent)" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
