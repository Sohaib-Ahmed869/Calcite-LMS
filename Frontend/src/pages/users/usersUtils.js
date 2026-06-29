import { ShieldCheck, Shield, GraduationCap, User } from 'lucide-react';

/**
 * Role catalogue for the Users & Roles UI — label, colour, icon, a plain-language description and a
 * permission summary shown on the Roles tab. `admin: true` marks roles that grant portal admin access
 * (these must stay in sync with the backend's ADMIN_ROLES). Order = seniority (most → least).
 */
export const ROLES = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    color: '#7c3aed',
    icon: ShieldCheck,
    admin: true,
    description: 'Unrestricted access to the entire portal, including users, roles, billing and settings.',
    permissions: ['Full access to every area', 'Manage users & assign roles', 'Branding, billing & settings', 'Create & manage all courses'],
  },
  {
    value: 'admin',
    label: 'Administrator',
    color: '#2563eb',
    icon: Shield,
    admin: true,
    description: 'Runs day-to-day operations — courses, students, enrolments and content.',
    permissions: ['Manage courses & content', 'Manage students & enrolments', 'Manage the schedule & reports', 'Manage user accounts'],
  },
  {
    value: 'instructor',
    label: 'Instructor',
    color: '#0d9488',
    icon: GraduationCap,
    admin: false,
    description: 'Teaches courses — builds learning material and follows enrolled students.',
    permissions: ['Create & edit their courses', 'Upload lessons & resources', 'View enrolled students', 'No access to portal settings'],
  },
  {
    value: 'student',
    label: 'Student',
    color: '#64748b',
    icon: User,
    admin: false,
    description: 'A learner — accesses enrolled courses and tracks their own progress.',
    permissions: ['Access enrolled courses', 'Track personal progress', 'Earn certificates', 'No administrative access'],
  },
];

const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.value, r]));

/** Metadata for a role value, with a graceful fallback for unknown/legacy roles. */
export function roleMeta(value) {
  if (ROLE_MAP[value]) return ROLE_MAP[value];
  const label = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  // Treat any unrecognised "*admin*" role as an admin-tier role so it styles + filters correctly.
  const admin = /admin/i.test(String(value));
  return { value, label: label || 'Unknown', color: admin ? '#2563eb' : '#64748b', icon: admin ? Shield : User, admin, description: '', permissions: [] };
}

/** The single most-senior role on a user (drives the primary badge / sorting). */
export function primaryRole(roles = []) {
  for (const r of ROLES) if (roles.includes(r.value)) return r.value;
  return roles[0] || 'student';
}

/** True if the user holds any admin-tier role. */
export const isAdminUser = (roles = []) => roles.some((r) => roleMeta(r).admin);

/** Roles offered in the create/edit picker. */
export const ASSIGNABLE_ROLES = ROLES;
