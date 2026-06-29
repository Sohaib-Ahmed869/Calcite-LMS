import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, PanelLeftClose, PanelLeftOpen, Home, ChevronDown, User as UserIcon, LogOut, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthProvider';
import { useAdminUi } from '../../admin-ui/AdminUiContext';
import { titleForPath } from '../../app/nav';
import { useBreadcrumbTrail } from '../../app/breadcrumbs';
import { humanize } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui';
import { NotificationBell } from './NotificationBell';
import { StudentSwitcher } from './StudentSwitcher';

// The bar is always dark (matches the sidebar), so its direct controls are light-on-dark.
const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-btn text-white/70 transition-colors hover:bg-white/10 hover:text-white';

function Breadcrumbs() {
  const location = useLocation();
  const { user } = useAuth();
  const trail = useBreadcrumbTrail();
  const atHome = location.pathname === '/';
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm md:flex">
      <Link to="/" className="inline-flex shrink-0 items-center gap-1 text-white/55 transition-colors hover:text-white">
        <Home className="h-3.5 w-3.5" /> Home
      </Link>
      {trail.length > 0 ? (
        trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <span key={i} className="inline-flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-white/25">/</span>
              {last || !item.to ? (
                <span className="truncate font-medium text-white">{item.label}</span>
              ) : (
                <Link to={item.to} className="truncate text-white/55 transition-colors hover:text-white">{item.label}</Link>
              )}
            </span>
          );
        })
      ) : atHome ? null : (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-white/25">/</span>
          <span className="truncate font-medium text-white">{titleForPath(location.pathname, user?.role)}</span>
        </span>
      )}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useAdminUi();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={iconBtn}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setOpen(false);
    navigate('/login');
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2.5 rounded-btn p-1 pr-1.5 transition-colors hover:bg-white/5">
        <Avatar name={user?.displayName} src={user?.profileImage} size="sm" className="ring-1 ring-white/15" />
        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block max-w-[150px] truncate text-[13px] font-semibold text-white">{user?.displayName}</span>
          <span className="block truncate text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">{humanize(user?.role)}</span>
        </span>
        <ChevronDown className={cn('hidden h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 sm:block', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">{user?.displayName}</p>
            <p className="truncate text-[12px] text-muted-foreground">{user?.email}</p>
          </div>
          <Link to="/admin/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition hover:bg-muted" onClick={() => setOpen(false)}>
            <UserIcon className="h-4 w-4 text-muted-foreground" /> Profile
          </Link>
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-danger transition hover:bg-muted">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Themed top bar — a full-width dark band that reads as one frame with the sidebar. */
export function Header() {
  const { sidebarCollapsed, toggleSidebar, openMobileSidebar } = useAdminUi();

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-30 flex h-16 items-center font-nav text-white transition-[left] duration-300 ease-in-out',
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-64',
      )}
      style={{ background: 'var(--color-sidebar)', boxShadow: '0 4px 18px -10px rgba(0,0,0,0.6)' }}
    >
      <div className="flex h-full w-full items-center gap-3 px-3 lg:px-4">
        <button type="button" className={cn(iconBtn, 'lg:hidden')} onClick={openMobileSidebar} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, 'hidden lg:inline-flex')}
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <Breadcrumbs />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <StudentSwitcher />
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export default Header;
