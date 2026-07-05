<<<<<<< HEAD
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Database, FileText, MessageSquare, History,
  Search, FlaskConical, BarChart2, Shield, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',      icon: LayoutDashboard, to: '/' },
  { label: 'Knowledge Bases',icon: Database,        to: '/knowledge-bases' },
  { label: 'Documents',      icon: FileText,        to: '/knowledge-bases' },
  { label: 'Chat',           icon: MessageSquare,   to: '/chat' },
  { label: 'History',        icon: History,         to: '/conversations' },
  { label: 'Retrieval',      icon: Search,          to: '/retrieval' },
  { label: 'Evaluation',     icon: FlaskConical,    to: '/evaluation' },
  { label: 'Analytics',      icon: BarChart2,       to: '/analytics' },
  { label: 'Governance',     icon: Shield,          to: '/governance' },
  { label: 'Admin',          icon: Settings,        to: '/admin' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const location = useLocation();

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem('sidebar-collapsed', String(!c));
      return !c;
    });
  };

  const width = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  return (
    <nav
      style={{
        width,
        minWidth: width,
        height: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: 10, height: 'var(--topnav-height)', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'var(--text-on-accent)', fontSize: 14, fontWeight: 700 }}>V</span>
        </div>
        {!collapsed && <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>VectraFlow</span>}
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navItems.map(({ label, icon: Icon, to }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <NavLink
              key={label}
              to={to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 36,
                padding: '0 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(0,192,122,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'color 0.15s, background 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && label}
            </NavLink>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        style={{
          margin: 8,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          padding: '0 12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          borderRadius: 'var(--radius-md)',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </nav>
  );
}
=======
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Database, MessageSquare, History, Search, Settings, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Tooltip } from '../ui/Tooltip';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/knowledge-bases', label: 'Knowledge Bases', icon: Database },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/conversations', label: 'History', icon: History },
  { to: '/retrieval', label: 'Retrieval', icon: Search },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<{ mobileOpen?: boolean; onCloseMobile?: () => void }> = ({ mobileOpen, onCloseMobile }) => {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const width = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const content = (
    <aside
      className="hide-mobile"
      style={{
        width,
        minWidth: width,
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: mobileOpen !== undefined ? 'fixed' : 'relative',
        zIndex: 60,
      }}
    >
      <div
        style={{
          height: 'var(--nav-height)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: collapsed ? '0' : '0 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: 'var(--accent)',
            color: 'var(--text-on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          VF
        </div>
        {!collapsed && <span style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>VectraFlow</span>}
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const linkContent = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 12,
                justifyContent: collapsed ? 'center' : 'flex-start',
                height: 36,
                padding: '0 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <Icon size={18} style={{ minWidth: 18 }} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
          return collapsed ? (
            <Tooltip key={item.to} label={item.label}>
              {linkContent}
            </Tooltip>
          ) : (
            linkContent
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', padding: 12 }}>
        {!collapsed && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                color: 'var(--text-on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </span>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'space-between' }}>
          <button
            className="btn-icon"
            aria-label="Sign out"
            onClick={handleLogout}
            style={{ width: collapsed ? 32 : 'auto', padding: collapsed ? 0 : '0 8px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <LogOut size={16} />
            {!collapsed && <span style={{ fontSize: 13 }}>Sign out</span>}
          </button>
          <button
            className="btn-icon"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );

  return content;
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
