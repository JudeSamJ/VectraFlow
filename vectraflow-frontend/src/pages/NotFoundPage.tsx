import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '100px 0' }}>
      <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Compass size={24} color="var(--text-muted)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Page not found</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
          That page doesn't exist or hasn't been built yet.
        </p>
      </div>
      <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
    </div>
  );
}
