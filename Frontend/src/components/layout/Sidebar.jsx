import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/cn';
import { useBranding } from '../../theme/BrandingProvider';
import { useAuth } from '../../auth/AuthProvider';
import { useAdminUi } from '../../admin-ui/AdminUiContext';
import { navGroupsForRole } from '../../app/nav';

// Present an org name nicely even when only a raw slug is available.
function prettifyName(raw) {
  if (!raw) return 'Calcite LMS';
  if (/[A-Z]/.test(raw) || /\s/.test(raw)) return raw;
  return raw.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The app sidebar — recreated to match the reference admin shell, adapted to Calcite LMS's tokens.
 * A full-height dark rail: an accent glow spreading from the left edge layered over the brand
 * gradient (both derived from the tenant's `--color-sidebar` / `--color-accent`), reference-style
 * nav items (accent-tinted active state + a guide pill), collapse, a bottom logout, and a mobile
 * drawer. Collapse / mobile state lives in AdminUiContext (shared with the topbar).
 */
export function Sidebar() {
  const { branding, tenant } = useBranding();
  const { user, logout } = useAuth();
  const { sidebarCollapsed, mobileSidebarOpen, closeMobileSidebar, collapsedGroups, toggleGroup } = useAdminUi();
  const navigate = useNavigate();

  const logos = branding?.logos || {};
  const navGroups = navGroupsForRole(user?.role);

  const brandName = prettifyName(tenant?.name || branding?.displayName);
  const brandInitial = (brandName || 'U').trim().charAt(0).toUpperCase();
  // Dark rail → prefer the light/expanded logo; collapsed → the square mark.
  const logo = sidebarCollapsed ? logos.mark || logos.full : logos.full || logos.mark;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    closeMobileSidebar();
    navigate('/login');
  };

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col font-nav text-white transition-[width,transform] duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
          'w-64',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          background: [
            'linear-gradient(to right, rgba(var(--color-accent-rgb), 0.18), rgba(var(--color-accent-rgb), 0.05) 45%, transparent 78%)',
            'linear-gradient(180deg, var(--color-sidebar) 0%, color-mix(in srgb, var(--color-sidebar) 86%, #000) 100%)',
          ].join(', '),
          boxShadow: '4px 0 18px -10px rgba(0,0,0,0.6)',
        }}
      >
        {/* Brand */}
        <div className={cn('flex shrink-0 items-center', sidebarCollapsed ? 'h-16 justify-center px-3' : 'justify-center px-4 pt-7 pb-5')}>
          <Link to="/" className="flex min-w-0 items-center justify-center gap-2.5" onClick={closeMobileSidebar}>
            {logo ? (
              <img
                src={logo}
                alt={brandName}
                className={cn('shrink-0 object-contain', sidebarCollapsed ? 'h-10 w-10' : 'h-14 w-auto max-w-[210px]')}
              />
            ) : (
              <>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[15px] font-extrabold leading-none text-white ring-1 ring-white/20"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 80%, #fff))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.25)',
                  }}
                >
                  {brandInitial}
                </span>
                {!sidebarCollapsed ? (
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-[15px] font-bold tracking-tight text-white">{brandName}</span>
                    <span className="truncate text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">Portal</span>
                  </span>
                ) : null}
              </>
            )}
          </Link>
        </div>

        {/* Nav — labelled, collapsible groups */}
        <nav className="scrollbar-none flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => {
            // Always open when flat, or when the rail is collapsed (labels hidden); else honour the toggle.
            const groupOpen = group.flat || sidebarCollapsed || !collapsedGroups[group.label];
            return (
              <div key={group.label}>
                {group.flat ? null : !sidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={groupOpen}
                    className="mb-1 flex w-full items-center justify-between gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/70"
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', groupOpen ? 'rotate-0' : '-rotate-90')} />
                  </button>
                ) : (
                  // Collapsed rail → a thin divider stands in for the group header.
                  <div className="mx-2 my-2 border-t border-white/10" />
                )}

                {groupOpen ? (
                  <ul
                    className={cn(
                      'space-y-1 transition-[margin,padding,border-color] duration-300 ease-in-out',
                      !group.flat && 'border-l',
                      !group.flat && (sidebarCollapsed ? 'ml-0 border-transparent pl-0' : 'ml-3 border-white/10 pl-2.5'),
                    )}
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            end={item.end}
                            title={sidebarCollapsed ? item.label : undefined}
                            onClick={closeMobileSidebar}
                            className={({ isActive }) =>
                              cn(
                                'group relative flex items-center gap-3 rounded-btn px-3 py-2 text-sm font-medium transition-colors duration-200',
                                !isActive && 'text-white/70 hover:bg-white/5 hover:text-white',
                              )
                            }
                            style={({ isActive }) =>
                              isActive ? { backgroundColor: 'rgba(var(--color-accent-rgb), 0.18)', color: 'var(--color-accent)' } : undefined
                            }
                          >
                            {({ isActive }) => (
                              <>
                                {/* Active guide-pill sits over the group's left border. */}
                                {isActive && !sidebarCollapsed && !group.flat ? (
                                  <span className="absolute inset-y-1 -left-[11px] w-[3px] rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} aria-hidden="true" />
                                ) : null}
                                <Icon className="h-[18px] w-[18px] shrink-0" />
                                <span className={cn('min-w-0 flex-1 truncate transition-opacity duration-200', sidebarCollapsed && 'lg:opacity-0')}>{item.label}</span>
                              </>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : undefined}
            aria-label="Logout"
            className="flex w-full items-center gap-2.5 rounded-btn px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={cn('min-w-0 flex-1 truncate text-left transition-opacity duration-200', sidebarCollapsed && 'lg:opacity-0')}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileSidebarOpen ? (
        <button type="button" aria-label="Close sidebar" className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={closeMobileSidebar} />
      ) : null}
    </>
  );
}

export default Sidebar;
