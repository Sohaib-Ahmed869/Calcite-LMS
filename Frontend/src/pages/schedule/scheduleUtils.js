import { GraduationCap, ClipboardCheck, FileText, Presentation, Users, Sun, CalendarClock } from 'lucide-react';

/** Event types — each carries a label, a distinct calendar colour and an icon. */
export const EVENT_TYPES = [
  { value: 'class', label: 'Class', color: '#6366f1', icon: GraduationCap },
  { value: 'exam', label: 'Exam', color: '#ef4444', icon: ClipboardCheck },
  { value: 'assignment', label: 'Assignment', color: '#f59e0b', icon: FileText },
  { value: 'workshop', label: 'Workshop', color: '#10b981', icon: Presentation },
  { value: 'meeting', label: 'Meeting', color: '#0ea5e9', icon: Users },
  { value: 'holiday', label: 'Holiday', color: '#ec4899', icon: Sun },
  { value: 'other', label: 'Other', color: '#64748b', icon: CalendarClock },
];

export const EVENT_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_MAP = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t]));
/** Metadata (label/color/icon) for an event type, falling back to "other". */
export const typeMeta = (type) => TYPE_MAP[type] || TYPE_MAP.other;
/** The colour an event should render with — its explicit override, else its type colour. */
export const eventColor = (ev) => ev?.color || typeMeta(ev?.type).color;

/** A hex colour with an alpha suffix, e.g. hexA('#6366f1', 0.12). */
export const hexA = (hex, alpha) => `${hex}${Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0')}`;

/* ── Date helpers (native Date, local time) ──────────────────────────────────── */
const pad = (n) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD for a date value. */
export const toYmd = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** Local HH:mm for a date value. */
export const toHm = (date) => {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** Combine a 'YYYY-MM-DD' and 'HH:mm' into a local Date. */
export const fromDateTime = (ymd, hm) => {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const [hh, mm] = String(hm || '00:00').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
};

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
export const addDays = (date, n) => { const x = new Date(date); x.setDate(x.getDate() + n); return x; };
export const addMonths = (date, n) => { const x = new Date(date); x.setDate(1); x.setMonth(x.getMonth() + n); return x; };

export const sameDay = (a, b) => toYmd(a) === toYmd(b);
export const isToday = (d) => sameDay(d, new Date());
export const isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A 42-day (6×7) grid covering the month of `viewDate`, starting on the Sunday of week one. */
export const monthGrid = (viewDate) => {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
};

export const monthLabel = (date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
export const formatTime = (date) => new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const formatDayLong = (date) => new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
export const formatTimeRange = (ev) => (ev.allDay ? 'All day' : `${formatTime(ev.start)} – ${formatTime(ev.end)}`);

/** True if an event (possibly multi-day) covers the given calendar day. */
export const eventOnDay = (ev, day) => {
  const d = startOfDay(day).getTime();
  return d >= startOfDay(ev.start).getTime() && d <= startOfDay(ev.end).getTime();
};
