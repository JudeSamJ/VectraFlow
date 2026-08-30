import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { authApi } from '../../api/auth';

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: 'Too short', color: 'var(--status-high)' },
    { label: 'Weak', color: 'var(--status-high)' },
    { label: 'Fair', color: 'var(--status-medium)' },
    { label: 'Good', color: 'var(--accent)' },
    { label: 'Strong', color: 'var(--accent)' },
    { label: 'Excellent', color: 'var(--accent)' },
  ];
  return { score, ...levels[Math.min(score, levels.length - 1)] };
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => passwordStrength(password), [password]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'That reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="Invalid link"
        subtitle="This password reset link is missing its token"
        footer={<>Request a new one from <Link to="/forgot-password">here</Link></>}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          <AlertCircle size={16} /> No reset token found in the URL.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Make it something you haven't used before"
      footer={<>Remembered your old password? <Link to="/login">Sign in</Link></>}
    >
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', padding: '20px 8px' }}>
          <CheckCircle2 size={28} color="var(--accent)" />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Password reset. Taking you to sign in…
          </p>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <AuthInput
              label="New password" type="password" icon={<Lock size={16} />}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters" required minLength={8} autoComplete="new-password"
            />
            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: 3, borderRadius: 'var(--radius-full)',
                        background: i < strength.score ? strength.color : 'rgba(255,255,255,0.08)',
                        transition: 'background 0.2s',
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: strength.color, marginTop: 5 }}>{strength.label}</p>
              </div>
            )}
          </div>

          {error && (
            <div
              className="shake"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)',
                borderRadius: 'var(--radius-md)', padding: '10px 12px',
                color: 'var(--status-high)', fontSize: 'var(--text-sm)',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: 4, height: 44 }}>
            {loading ? <><Loader2 size={16} className="spin" /> Resetting…</> : 'Reset password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
