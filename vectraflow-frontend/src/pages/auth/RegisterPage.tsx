<<<<<<< HEAD
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/auth';

export function RegisterPage() {
=======
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Sparkles, KeyRound, Mail, User } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
<<<<<<< HEAD
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
=======

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      await login(email, name);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Registration failed.');
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
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}>Create an Account</h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Get started with Synapse RAG Assistant</p>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--status-high)', fontSize: 'var(--text-xs)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Full name</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" 
                className="input" 
                style={{ paddingLeft: '36px' }}
                required 
              />
              <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

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
            Get Started
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <button 
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontWeight: '500', cursor: 'pointer', outline: 'none' }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
