import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/auth';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: 'var(--accent)', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ color: 'var(--text-on-accent)', fontSize: 22, fontWeight: 700 }}>V</span>
          </div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Sign in to VectraFlow</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 6 }}>Your RAG knowledge assistant</p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          {error && <p style={{ color: 'var(--status-high)', fontSize: 'var(--text-sm)' }}>{error}</p>}
          <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
