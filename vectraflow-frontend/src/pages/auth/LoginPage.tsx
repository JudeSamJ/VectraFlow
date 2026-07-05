<<<<<<< HEAD
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
=======
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Sparkles, KeyRound, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Invalid login credentials.');
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
    }
  };

  return (
<<<<<<< HEAD
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
=======
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-primary)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000
      }}
    >
      <div 
        className="card"
        style={{
          width: '380px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-emphasis)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={36} color="var(--accent-green)" />
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}>Sign In to Synapse</h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>AI-Native RAG Knowledge Assistant</p>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--status-high)', fontSize: 'var(--text-xs)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Email address</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" 
                className="input" 
                style={{ paddingLeft: '36px' }}
                required 
              />
              <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="input" 
                style={{ paddingLeft: '36px' }}
                required 
              />
              <KeyRound size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '40px', marginTop: '8px' }}>
            Sign In
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
          <button 
            onClick={() => navigate('/register')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontWeight: '500', cursor: 'pointer', outline: 'none' }}
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
