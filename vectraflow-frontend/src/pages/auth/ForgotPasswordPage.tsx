import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { authApi } from '../../api/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      // Backend intentionally always responds the same way whether or not
      // the address is registered, so this page never reveals that either.
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to get back in"
      footer={<>Remembered it? <Link to="/login">Sign in</Link></>}
    >
      {sent ? (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            textAlign: 'center', padding: '20px 8px',
          }}
        >
          <CheckCircle2 size={28} color="var(--accent)" />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            If <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> is registered, a reset link
            is on its way. It expires in 1 hour.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <AuthInput
            label="Email" type="email" icon={<Mail size={16} />}
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com" required autoComplete="email"
          />

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
            {loading ? <><Loader2 size={16} className="spin" /> Sending…</> : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
