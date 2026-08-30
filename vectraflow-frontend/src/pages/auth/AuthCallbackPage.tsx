import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

/**
 * Lands here after a successful Google/GitHub OAuth redirect:
 * GET /api/v1/auth/{provider}/callback -> 302 to
 * /auth/callback?token=...&refresh=...
 *
 * Reads the tokens out of the URL, fetches the profile, and completes
 * the same sign-in the password flow does.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get('token');
    if (!token) {
      navigate('/login?error=oauth_failed&reason=missing_token', { replace: true });
      return;
    }

    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    authApi
      .me()
      .then(res => {
        setAuth(res.data, token);
        navigate('/', { replace: true });
      })
      .catch(() => {
        navigate('/login?error=oauth_failed&reason=profile_fetch_failed', { replace: true });
      });
  }, [searchParams, navigate, setAuth]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
      <Loader2 size={18} className="spin" /> Signing you in…
    </div>
  );
}
