import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactNode;
}

export function AuthInput({ label, icon, type, style, ...props }: AuthInputProps) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (reveal ? 'text' : 'password') : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            position: 'absolute', left: 13, display: 'flex', alignItems: 'center',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }}
        >
          {icon}
        </span>
        <input
          type={resolvedType}
          {...props}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            padding: `10px ${isPassword ? 40 : 14}px 10px 38px`,
            height: 42,
            fontSize: 'var(--text-base)',
            outline: 'none',
            width: '100%',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            ...style,
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            props.onFocus?.(e);
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal(r => !r)}
            tabIndex={-1}
            style={{
              position: 'absolute', right: 10, display: 'flex', alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
            }}
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
