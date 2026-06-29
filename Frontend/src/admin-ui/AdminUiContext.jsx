import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Shell UI state shared by the sidebar + topbar (mirrors the reference admin shell):
 *   • theme            — light/dark preference, persisted; applied via `data-admin-theme` on the shell
 *   • sidebarCollapsed — desktop rail collapse, persisted
 *   • mobileSidebarOpen — mobile drawer open/close
 */
const THEME_KEY = 'uc.adminTheme';
const COLLAPSE_KEY = 'uc.sidebarCollapsed';
const GROUPS_KEY = 'uc.navGroups';
const AdminUiContext = createContext(null);

function loadGroups() {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_KEY)) || {};
  } catch {
    return {};
  }
}

function loadTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function AdminUiProvider({ children }) {
  const [theme, setTheme] = useState(loadTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(loadGroups);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(collapsedGroups));
    } catch {
      /* ignore */
    }
  }, [collapsedGroups]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const toggleGroup = useCallback((label) => setCollapsedGroups((g) => ({ ...g, [label]: !g[label] })), []);

  return (
    <AdminUiContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        mobileSidebarOpen,
        openMobileSidebar,
        closeMobileSidebar,
        collapsedGroups,
        toggleGroup,
      }}
    >
      {children}
    </AdminUiContext.Provider>
  );
}

export function useAdminUi() {
  const ctx = useContext(AdminUiContext);
  if (!ctx) throw new Error('useAdminUi must be used within <AdminUiProvider>');
  return ctx;
}

/**
 * Wrap content to opt into the dark/light surface tokens. Kept for standalone use; the app shell
 * (AppLayout) already carries `data-admin-theme`, so pages inside it need not wrap again.
 */
export function AdminThemeScope({ className = '', children }) {
  const { theme } = useAdminUi();
  return (
    <div data-admin-theme={theme} className={className} style={{ backgroundColor: 'var(--color-background)' }}>
      {children}
    </div>
  );
}
