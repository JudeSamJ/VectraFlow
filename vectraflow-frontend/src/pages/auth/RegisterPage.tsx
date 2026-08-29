import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, Loader2, Check } from 'lucide-react';
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

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strength = useMemo(() => passwordStrength(password), [password]);

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
    <AuthLayout
      title="Create your account"
      subtitle="Set up your RAG knowledge assistant"
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <AuthInput
          label="Name" icon={<User size={16} />}
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name" required autoComplete="name"
        />
        <AuthInput
          label="Email" type="email" icon={<Mail size={16} />}
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com" required autoComplete="email"
        />
        <div>
          <AuthInput
            label="Password" type="password" icon={<Lock size={16} />}
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
          {loading ? <><Loader2 size={16} className="spin" /> Creating account…</> : <><Check size={16} /> Create account</>}
        </Button>
      </form>
    </AuthLayout>
  );
}
