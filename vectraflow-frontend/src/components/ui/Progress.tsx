import { type HTMLAttributes } from 'react';

interface LinearProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  gradient?: boolean;
}

export function LinearProgress({ value, gradient, style, ...props }: LinearProgressProps) {
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', ...style }} {...props}>
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: gradient
            ? 'linear-gradient(90deg, var(--accent), #00E090)'
            : 'var(--accent)',
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({ value, size = 80, strokeWidth = 6 }: CircularProgressProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1A1A1A" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}
