<<<<<<< HEAD
import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'icon';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const hoverBg: Record<Variant, string> = {
  primary: 'var(--accent-dark)',
  secondary: 'rgba(255,255,255,0.05)',
  destructive: 'rgba(255,77,77,0.08)',
  icon: 'rgba(255,255,255,0.07)',
};

const defaultBg: Record<Variant, string> = {
  primary: 'var(--accent)',
  secondary: 'transparent',
  destructive: 'transparent',
  icon: 'transparent',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', style, children, ...props }, ref) => {
    const isIcon = variant === 'icon';
    return (
      <button
        ref={ref}
        {...props}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: isIcon ? 32 : size === 'sm' ? 30 : 36,
          padding: isIcon ? 0 : size === 'sm' ? '0 12px' : '0 16px',
          width: isIcon ? 32 : undefined,
          borderRadius: isIcon ? 'var(--radius-sm)' : 'var(--radius-md)',
          fontSize: size === 'sm' ? 'var(--text-sm)' : 'var(--text-base)',
          fontWeight: 500,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          opacity: props.disabled ? 0.5 : 1,
          transition: 'background 0.15s, transform 0.1s',
          whiteSpace: 'nowrap',
          background: defaultBg[variant],
          color: variant === 'primary' ? 'var(--text-on-accent)' : variant === 'destructive' ? 'var(--status-high)' : 'var(--text-primary)',
          border: variant === 'secondary' ? '1px solid var(--border-emphasis)' : variant === 'destructive' ? '1px solid rgba(255,77,77,0.3)' : 'none',
          boxShadow: variant === 'primary' ? '0 0 20px rgba(0,192,122,0.25)' : undefined,
          ...style,
        }}
        onMouseEnter={e => {
          if (props.disabled) return;
          e.currentTarget.style.background = hoverBg[variant];
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={e => {
          if (props.disabled) return;
          e.currentTarget.style.background = defaultBg[variant];
          props.onMouseLeave?.(e);
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; props.onMouseDown?.(e); }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; props.onMouseUp?.(e); }}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
=======
import React from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...rest }) => {
  const variantClass = variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : 'btn-danger';
  return (
    <button className={`btn ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...rest }) => (
  <button className={`btn-icon ${className}`} {...rest}>
    {children}
  </button>
);
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
