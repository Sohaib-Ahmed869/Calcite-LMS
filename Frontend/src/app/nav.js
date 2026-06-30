import { LayoutDashboard, Users, BookOpen, GraduationCap, ClipboardList, BarChart3, SwatchBook, UsersRound, Settings, CalendarDays, CreditCard, CircleUser } from 'lucide-react';
import { humanize } from '../lib/format';

/**
 * The portal's navigation model. `navGroupsForRole(role)` returns labelled, collapsible groups for
 * the sidebar; `titleForPath(pathname)` resolves a page title for breadcrumbs / the document.
 *
 * Group shape:  { label, flat?, items: [{ to, label, icon, end? }] }
 *   • flat groups render without a header (used for the top-level "Overview" item).
 */
// Overview is shown to everyone (students and admins).
const COMMON_GROUPS = [
  {
    label: 'Overview',
    flat: true,
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
];

// Student-only — "My Learning" isn't relevant to admins, so it's gated out of the admin sidebar.
const LEARNING_GROUPS = [
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

// Full set — also drives the title/icon lookups below, so /learn still resolves for an admin
// who opens "Preview as student" even though it's not in their sidebar.
const GROUPS = [...COMMON_GROUPS, ...LEARNING_GROUPS, ...ADMIN_GROUPS];

// Coarse role gating — admins get Overview + admin tools (no "My Learning");
// students get Overview + Learning only.
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'calcite_administrator', 'superadmin', 'owner']);

export function navGroupsForRole(role) {
  if (ADMIN_ROLES.has(role)) return [...COMMON_GROUPS, ...ADMIN_GROUPS];
  return [...COMMON_GROUPS, ...LEARNING_GROUPS];
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

// Icon lookup parallel to TITLES, so the page loader can show the same mark as the active nav item.
const ICONS = {};
GROUPS.forEach((g) => g.items.forEach((i) => (ICONS[i.to] = i.icon)));

export function iconForPath(pathname) {
  if (ICONS[pathname]) return ICONS[pathname];
  // Longest matching prefix (so /students/123 → the Students icon).
  const match = Object.keys(ICONS)
    .filter((p) => p !== '/' && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  // Fall back to the brand mark for any route without its own icon.
  return match ? ICONS[match] : GraduationCap;
}

export default navGroupsForRole;
