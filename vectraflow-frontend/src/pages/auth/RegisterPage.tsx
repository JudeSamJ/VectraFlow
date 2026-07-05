import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/auth';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register(name, email, password);
      navigate('/login');
    } catch {
      setError('Registration failed. Please try again.');
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
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Create your account</h1>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
          {error && <p style={{ color: 'var(--status-high)', fontSize: 'var(--text-sm)' }}>{error}</p>}
          <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
