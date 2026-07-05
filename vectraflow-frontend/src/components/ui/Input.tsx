<<<<<<< HEAD
import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && (
          <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
=======
import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div>
        {label && (
          <label className="field-label" htmlFor={inputId}>
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
            {label}
          </label>
        )}
        <input
          ref={ref}
<<<<<<< HEAD
          {...props}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${error ? 'var(--status-high)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            padding: '10px 12px',
            height: 38,
            fontSize: 'var(--text-base)',
            outline: 'none',
            width: '100%',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            ...style,
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(0,192,122,0.5)';
            e.currentTarget.style.boxShadow = 'var(--focus-ring)';
            props.onFocus?.(e);
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? 'var(--status-high)' : 'rgba(255,255,255,0.08)';
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        />
        {error && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--status-high)' }}>{error}</span>
        )}
=======
          id={inputId}
          className={`input ${error ? 'input-error' : ''} ${className}`}
          aria-invalid={!!error}
          {...rest}
        />
        {error && <p className="field-error">{error}</p>}
        {!error && hint && <p className="field-hint">{hint}</p>}
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
      </div>
    );
  }
);
<<<<<<< HEAD

=======
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
Input.displayName = 'Input';
