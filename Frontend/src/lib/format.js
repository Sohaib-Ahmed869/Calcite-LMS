/**
 * Turn a token / slug / enum into a human-friendly label:
 *   'mutedForeground' → 'Muted Foreground'
 *   'super_admin'     → 'Super Admin'
 *   'sidebar-accent'  → 'Sidebar Accent'
 */
export function humanize(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → spaced
    .replace(/[_-]+/g, ' ') // snake / kebab → spaced
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Initials for an avatar fallback: 'Avery Quinn' → 'AQ'. */
export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format a date value for display: '2026-06-29' → 'Jun 29, 2026'. Returns '—' when empty/invalid. */
export function formatDate(value, opts) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, opts || { year: 'numeric', month: 'short', day: 'numeric' });
}

export default humanize;
