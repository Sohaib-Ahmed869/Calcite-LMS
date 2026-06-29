import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAdminUi } from '../../admin-ui/AdminUiContext';
import { BreadcrumbProvider } from '../../app/breadcrumbs';
import { cn } from '../../lib/cn';

/** Scroll the page back to the top on every route change. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

/**
 * The app frame — a "unified frame" shell matching the reference: a full-height dark left rail and a
 * full-width dark top bar (same brand colour) read as one connected frame, with the routed content
 * sitting in a panel that has a soft rounded top-left corner where it meets the frame. The shell
 * carries `data-admin-theme`, so the light/dark toggle re-skins the whole content area.
 */
export function AppLayout() {
  const { sidebarCollapsed, theme } = useAdminUi();

  return (
    <BreadcrumbProvider>
      <ScrollToTop />
      <div data-admin-theme={theme} className="min-h-screen" style={{ backgroundColor: 'var(--color-sidebar)' }}>
        <Sidebar />
        <Header />

        <main className={cn('min-h-screen pt-16 transition-[padding] duration-300 ease-in-out', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64')}>
          <div
            className="min-h-[calc(100vh-4rem)] bg-background px-4 py-6 md:rounded-tl-[var(--radius-card)] lg:px-6"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </BreadcrumbProvider>
  );
}

export default AppLayout;
