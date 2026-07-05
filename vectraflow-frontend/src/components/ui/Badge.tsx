import { type HTMLAttributes } from 'react';

type BadgeVariant = 'ready' | 'indexing' | 'error' | 'warning' | 'pending' | 'high' | 'medium' | 'low';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantMap: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  ready:    { bg: 'rgba(0,192,122,0.1)',   color: '#00C07A', border: 'rgba(0,192,122,0.2)' },
  low:      { bg: 'rgba(0,192,122,0.1)',   color: '#00C07A', border: 'rgba(0,192,122,0.2)' },
  indexing: { bg: 'rgba(124,109,255,0.1)', color: '#7C6DFF', border: 'rgba(124,109,255,0.2)' },
  pending:  { bg: 'rgba(90,90,90,0.15)',   color: '#9A9A9A', border: 'rgba(255,255,255,0.08)' },
  error:    { bg: 'rgba(255,77,77,0.1)',   color: '#FF4D4D', border: 'rgba(255,77,77,0.2)' },
  high:     { bg: 'rgba(255,77,77,0.1)',   color: '#FF4D4D', border: 'rgba(255,77,77,0.2)' },
  warning:  { bg: 'rgba(255,160,67,0.1)',  color: '#FFA043', border: 'rgba(255,160,67,0.2)' },
  medium:   { bg: 'rgba(255,160,67,0.1)',  color: '#FFA043', border: 'rgba(255,160,67,0.2)' },
};

export function Badge({ variant = 'pending', style, children, ...props }: BadgeProps) {
  const v = variantMap[variant];
  return (
    <span
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        padding: '0 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
