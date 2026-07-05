<<<<<<< HEAD
import { type HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          transition: 'border-color 0.15s, background 0.15s',
          cursor: interactive ? 'pointer' : undefined,
          ...style,
        }}
        onMouseEnter={e => {
          if (interactive) {
            e.currentTarget.style.borderColor = 'var(--border-emphasis)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
          }
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={e => {
          if (interactive) {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.background = 'var(--bg-surface)';
          }
          props.onMouseLeave?.(e);
        }}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
=======
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({ interactive, className = '', children, ...rest }) => (
  <div className={`card ${interactive ? 'card-interactive' : ''} ${className}`} {...rest}>
    {children}
  </div>
);
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
