import { Bell, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';

export function TopNav() {
  const user = useAuthStore(s => s.user);

  return (
    <header
      style={{
        height: 'var(--topnav-height)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        gap: 8,
        background: 'var(--bg-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <Button variant="icon"><Bell size={16} /></Button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <div style={{
          width: 28, height: 28,
          background: 'linear-gradient(135deg, var(--accent), var(--status-pending))',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'var(--text-xs)', fontWeight: 600, color: '#fff',
        }}>
          {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{user?.full_name ?? 'User'}</span>
        <ChevronDown size={14} color="var(--text-muted)" />
      </div>
    </header>
  );
}
