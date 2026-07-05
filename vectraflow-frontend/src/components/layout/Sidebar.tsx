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
