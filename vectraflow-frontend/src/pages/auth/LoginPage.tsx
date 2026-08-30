import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { authApi } from '../../api/auth';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);

  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      const reason = searchParams.get('reason');
      setError(reason ? `Sign-in failed: ${reason}` : 'Sign-in failed. Please try again.');
    }
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const token = res.data.access_token;
      // Set token on the client so the /users/me call is authenticated
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const meRes = await authApi.me();
      setAuth(meRes.data, token);
      navigate('/');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to VectraFlow"
      subtitle="Your RAG knowledge assistant"
      footer={<>No account? <Link to="/register">Register</Link></>}
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <AuthInput
          label="Email" type="email" icon={<Mail size={16} />}
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com" required autoComplete="email"
        />
        <div>
          <AuthInput
            label="Password" type="password" icon={<Lock size={16} />}
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
          />
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <Link to="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Forgot password?
            </Link>
          </div>
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
          {loading ? <><Loader2 size={16} className="spin" /> Signing in…</> : 'Sign in'}
        </Button>

        <SocialAuthButtons />
      </form>
    </AuthLayout>
  );
}
