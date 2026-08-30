import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Database, FileText, MessageSquare, History,
  Search, FlaskConical, BarChart2, Shield, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUIStore } from '../../stores/uiStore';

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
  const isMobile = useIsMobile();
  const mobileNavOpen = useUIStore(s => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore(s => s.setMobileNavOpen);

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem('sidebar-collapsed', String(!c));
      return !c;
    });
  };

  // On mobile the sidebar is always "expanded" content-wise (labels shown) since
  // it's a full off-canvas drawer, not a narrow rail — collapse is a desktop-only concept.
  const expanded = isMobile || !collapsed;
  const width = isMobile ? '272px' : (collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)');

  const closeOnMobile = () => { if (isMobile) setMobileNavOpen(false); };

  return (
    <>
      {isMobile && mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }}
        />
      )}
      <nav
        style={{
          width,
          minWidth: width,
          height: '100vh',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          transition: isMobile ? 'transform 0.25s ease' : 'width 0.2s ease, min-width 0.2s ease',
          overflow: 'hidden',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          zIndex: 200,
          transform: isMobile ? (mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          boxShadow: isMobile && mobileNavOpen ? '0 0 32px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: 10, height: 'var(--topnav-height)', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'var(--text-on-accent)', fontSize: 14, fontWeight: 700 }}>V</span>
          </div>
          {expanded && <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>VectraFlow</span>}
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {navItems.map(({ label, icon: Icon, to }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={label}
                to={to}
                onClick={closeOnMobile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 40,
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
                {expanded && label}
              </NavLink>
            );
          })}
        </div>

        {/* Collapse toggle — desktop only; mobile closes via backdrop/nav click */}
        {!isMobile && (
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
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </nav>
    </>
  );
}
