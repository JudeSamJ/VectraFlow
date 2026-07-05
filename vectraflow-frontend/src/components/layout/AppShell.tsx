<<<<<<< HEAD
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function AppShell() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopNav />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
=======
import React, { useState } from 'react';
import { Home, Database, MessageSquare, History, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

const BOTTOM_NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/knowledge-bases', label: 'KBs', icon: Database },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/conversations', label: 'History', icon: History },
  { to: '/retrieval', label: 'Retrieval', icon: Search },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <TopNav onMenuClick={() => setMobileOpen((o) => !o)} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, paddingBottom: 84 }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto', width: '100%' }} className="page-enter">
            {children}
          </div>
        </main>
      </div>

      <nav
        className="bottom-nav"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', height: '100%' }}>
          {BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 10,
                })}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <style>{`
        @media (max-width: 480px) {
          .bottom-nav { display: block !important; }
        }
      `}</style>
    </div>
  );
};
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
