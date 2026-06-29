import { LayoutDashboard, Users, BookOpen, GraduationCap, ClipboardList, BarChart3, SwatchBook, UsersRound, Settings, CalendarDays, CreditCard, CircleUser } from 'lucide-react';
import { humanize } from '../lib/format';

/**
 * The portal's navigation model. `navGroupsForRole(role)` returns labelled, collapsible groups for
 * the sidebar; `titleForPath(pathname)` resolves a page title for breadcrumbs / the document.
 *
 * Group shape:  { label, flat?, items: [{ to, label, icon, end? }] }
 *   • flat groups render without a header (used for the top-level "Overview" item).
 */
// Groups visible to everyone (students included).
const COMMON_GROUPS = [
  {
    label: 'Overview',
    flat: true,
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Learning',
    items: [{ to: '/learn', label: 'My Learning', icon: GraduationCap }],
  },
];

// Admin-only groups.
const ADMIN_GROUPS = [
  {
    // Core teaching operations, ordered to follow the day-to-day workflow:
    // build the catalog → enrol learners → schedule sessions.
    label: 'Academics',
    items: [
      { to: '/courses', label: 'Courses', icon: BookOpen },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/enrollments', label: 'Enrollments', icon: ClipboardList },
      // { to: '/schedule', label: 'Schedule', icon: CalendarDays },
    ],
  },
  {
    // Analytics — kept apart from daily operations; grows as more dashboards land.
    label: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    // System configuration & access — least-frequent, so it sits at the bottom.
    label: 'Administration',
    items: [
      { to: '/admin/users', label: 'Users & Roles', icon: UsersRound },
      { to: '/admin/branding', label: 'Branding', icon: SwatchBook },
      { to: '/admin/profile', label: 'My Profile', icon: CircleUser },
      // { to: '/admin/billing', label: 'Billing', icon: CreditCard },
      // { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const GROUPS = [...COMMON_GROUPS, ...ADMIN_GROUPS];

// Coarse role gating — admins see everything; students get Overview + Learning only.
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'calcite_administrator', 'superadmin', 'owner']);

export function navGroupsForRole(role) {
  if (ADMIN_ROLES.has(role)) return GROUPS;
  return COMMON_GROUPS;
}

// Flat lookup of every routed title (plus a few that aren't in the sidebar).
const TITLES = {
  '/': 'Dashboard',
  '/admin/profile': 'My Profile',
};
GROUPS.forEach((g) => g.items.forEach((i) => (TITLES[i.to] = i.label)));

export function titleForPath(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  // Longest matching prefix (so /students/123 → "Students").
  const match = Object.keys(TITLES)
    .filter((p) => p !== '/' && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  if (match) return TITLES[match];
  const last = pathname.split('/').filter(Boolean).pop();
  return last ? humanize(last) : 'Dashboard';
}

export default navGroupsForRole;
