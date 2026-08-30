import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useIsMobile } from '../../hooks/useMediaQuery';

export function AppShell() {
  const isMobile = useIsMobile();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopNav />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? 16 : 24 }}>
          <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
