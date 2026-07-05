<<<<<<< HEAD
import { Bell, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';

export function TopNav() {
  const user = useAuthStore(s => s.user);
=======
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, User as UserIcon, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export const TopNav: React.FC<{ title?: string; onMenuClick?: () => void }> = ({ title, onMenuClick }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f

  return (
    <header
      style={{
<<<<<<< HEAD
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
=======
        height: 'var(--nav-height)',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-icon hide-tablet" aria-label="Open menu" onClick={onMenuClick}>
          <Menu size={18} />
        </button>
        {title && <span style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{title}</span>}
      </div>

      <span className="hide-tablet" style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>
        VectraFlow
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-icon" aria-label="Notifications" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
            }}
          />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="User menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                color: 'var(--text-on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <ChevronDown size={14} />
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                minWidth: 160,
                overflow: 'hidden',
                zIndex: 50,
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/settings');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <UserIcon size={14} /> Profile
              </button>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--status-error)',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
