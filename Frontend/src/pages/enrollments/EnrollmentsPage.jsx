import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  BookOpen,
  CheckCircle2,
  Activity,
  TrendingUp,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Card, Avatar, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { CustomSelect } from '../../admin-ui/CustomSelect';
import { AdminLoader } from '../../admin-ui/Loader';
import { ENR_STATUS_META, EnrollmentStatusMenu } from '../../admin-ui/EnrollmentStatusMenu';
import { EnrollmentService } from '../../services/enrollment.service';
import { EnrollModal } from './modals/EnrollModal';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });
const VIEW_KEY = 'enrollmentsView';

const VIEWS = [
  { id: 'list', label: 'Table', Icon: ListIcon },
  { id: 'grid', label: 'Grid', Icon: LayoutGrid },
];
// Sort rank so the Status column orders by workflow rather than alphabetically.
const STATUS_RANK = { active: 0, suspended: 1, withdrawn: 2, completed: 3 };

const studentName = (s) => s?.displayName || [s?.firstName, s?.lastName].filter(Boolean).join(' ').trim() || s?.email || 'Student';

/* ── Small pieces ────────────────────────────────────────────────────────────── */
function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-accent" style={accentTint(0.1)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ProgressBar({ value, className }) {
  const pct = value || 0;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

function CourseTag({ course, className }) {
  return (
    <Link to={`/courses/${course?._id}`} className={cn('inline-flex items-center gap-2 text-foreground hover:text-accent', className)}>
      <span className="grid h-7 w-9 shrink-0 place-items-center overflow-hidden rounded-md text-accent" style={accentTint(0.12)}>
        {course?.coverImageUrl ? <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="h-3.5 w-3.5" />}
      </span>
      <span className="truncate text-sm">{course?.title || 'Untitled course'}</span>
    </Link>
  );
}

/** Sortable column header. Click to sort by this column; click again to flip direction. */
function SortHeader({ label, sortKey, sort, onSort, align = 'left' }) {
  const active = sort.key === sortKey;
  const Arrow = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={cn('px-4 py-3.5', align === 'center' && 'text-center', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
        className={cn('group inline-flex select-none items-center gap-1 transition-colors hover:text-foreground', active && 'text-foreground')}
      >
        {label}
        <Arrow className={cn('h-3 w-3 shrink-0 transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')} />
      </button>
    </th>
  );
}

/* ── Rows / cards ────────────────────────────────────────────────────────────── */
const EnrollmentTableRow = memo(function EnrollmentTableRow({ row, onChangeStatus, onUnenroll }) {
  const s = row.student || {};
  const c = row.course || {};
  const name = studentName(s);
  return (
    <tr className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3">
        <Link to={`/students/${s._id}`} className="group flex items-center gap-3">
          <Avatar name={name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground transition-colors group-hover:text-accent">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
          </span>
        </Link>
      </td>
      <td className="px-4 py-3"><CourseTag course={c} className="max-w-[240px]" /></td>
      <td className="px-4 py-3"><ProgressBar value={row.progressPercent} className="max-w-[180px]" /></td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatDate(row.enrolledAt)}</td>
      <td className="px-4 py-3"><div className="w-36"><EnrollmentStatusMenu value={row.status} onChange={(v) => onChangeStatus(row, v)} /></div></td>
      <td className="px-4 py-3 text-right">
        <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={() => onUnenroll(row)} title="Unenroll" />
      </td>
    </tr>
  );
});

const EnrollmentMobileRow = memo(function EnrollmentMobileRow({ row, onChangeStatus, onUnenroll }) {
  const s = row.student || {};
  const c = row.course || {};
  const name = studentName(s);
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} size="md" />
        <div className="min-w-0 flex-1">
          <Link to={`/students/${s._id}`} className="block truncate font-semibold text-foreground">{name}</Link>
          <p className="truncate text-xs text-muted-foreground">{s.email}</p>
        </div>
        <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={() => onUnenroll(row)} title="Unenroll" />
      </div>
      <CourseTag course={c} className="mt-2.5" />
      <div className="mt-2.5"><ProgressBar value={row.progressPercent} /></div>
      <div className="mt-3"><EnrollmentStatusMenu value={row.status} onChange={(v) => onChangeStatus(row, v)} /></div>
    </div>
  );
});

const EnrollmentCard = memo(function EnrollmentCard({ row, onChangeStatus, onUnenroll }) {
  const s = row.student || {};
  const c = row.course || {};
  const name = studentName(s);
  const strip = (ENR_STATUS_META[row.status] || ENR_STATUS_META.active).dot;
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card className="group flex h-full flex-col gap-3 border-l-4 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift" style={{ borderLeftColor: strip }}>
        <div className="flex items-start gap-3">
          <Avatar name={name} size="md" />
          <div className="min-w-0 flex-1">
            <Link to={`/students/${s._id}`} className="line-clamp-1 font-semibold text-foreground transition-colors hover:text-accent">{name}</Link>
            <p className="line-clamp-1 text-xs text-muted-foreground">{s.email}</p>
          </div>
          <button
            type="button"
            onClick={() => onUnenroll(row)}
            title="Unenroll"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-danger group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <CourseTag course={c} className="rounded-lg bg-muted/60 px-2.5 py-2" />

        <ProgressBar value={row.progressPercent} />

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">Enrolled {formatDate(row.enrolledAt)}</span>
          <div className="ml-auto w-32"><EnrollmentStatusMenu value={row.status} onChange={(v) => onChangeStatus(row, v)} /></div>
        </div>
      </Card>
    </motion.div>
  );
});

export function EnrollmentsPage() {
  // cacheKey → render instantly from cache on revisit, then revalidate in the background.
  const { data, loading, error, refetch, mutate } = useApi(() => EnrollmentService.list(), [], { cacheKey: 'enrollments' });
  const rows = useMemo(() => data || [], [data]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || 'list'; } catch { return 'list'; }
  });
  const [showEnroll, setShowEnroll] = useState(false);
  const [unenroll, setUnenroll] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  const courseOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => { if (r.course?._id) map.set(String(r.course._id), r.course.title); });
    return [{ value: 'all', label: 'All courses' }, ...[...map].map(([value, label]) => ({ value, label }))];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (courseFilter !== 'all' && String(r.course?._id) !== courseFilter) return false;
      if (!q) return true;
      return [r.student?.firstName, r.student?.lastName, r.student?.email, r.course?.title].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter, courseFilter]);

  // Client-side sort of the filtered list — no extra API call. `key === null` keeps server order.
  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const valueOf = (r) => {
      switch (sort.key) {
        case 'student': return studentName(r.student).toLowerCase();
        case 'course': return (r.course?.title || '').toLowerCase();
        case 'progress': return r.progressPercent || 0;
        case 'enrolled': return new Date(r.enrolledAt).getTime() || 0;
        case 'status': return STATUS_RANK[r.status] ?? 99;
        default: return 0;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }, [filtered, sort]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    completed: rows.filter((r) => r.status === 'completed').length,
    avg: rows.length ? Math.round(rows.reduce((s, r) => s + (r.progressPercent || 0), 0) / rows.length) : 0,
  }), [rows]);

  const pills = useMemo(() => [
    { value: 'all', label: 'All', count: rows.length },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'completed', label: 'Completed', count: stats.completed },
    { value: 'suspended', label: 'Suspended', count: rows.filter((r) => r.status === 'suspended').length },
    { value: 'withdrawn', label: 'Withdrawn', count: rows.filter((r) => r.status === 'withdrawn').length },
  ], [rows, stats]);

  // Optimistically patch the status in the local cache, reconcile only on failure — no refetch.
  const changeStatus = useCallback(async (row, status) => {
    if (!row || status === row.status) return;
    const id = row._id;
    const prev = row.status;
    mutate((list) => list?.map((r) => (r._id === id ? { ...r, status } : r)));
    try {
      await EnrollmentService.setStatus(id, status);
      toast.success('Enrolment updated');
    } catch (e) {
      mutate((list) => list?.map((r) => (r._id === id ? { ...r, status: prev } : r)));
      toast.error(e.message || 'Failed to update');
    }
  }, [mutate]);

  const confirmUnenroll = useCallback(async () => {
    if (!unenroll) return;
    const id = unenroll._id;
    setRemoving(true);
    try {
      await EnrollmentService.remove(id);
      mutate((list) => list?.filter((r) => r._id !== id)); // drop locally — no refetch
      toast.success('Unenrolled');
      setUnenroll(null);
    } catch (e) {
      toast.error(e.message || 'Failed to unenroll');
    } finally {
      setRemoving(false);
    }
  }, [unenroll, mutate]);

  const handleUnenroll = useCallback((row) => setUnenroll(row), []);
  const onSort = useCallback((key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  if (loading && !data) return <AdminLoader label="Loading enrolments…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header card — gradient band + integrated stats */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          <GraduationCap className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rotate-12 text-white/10" />
          <Users className="pointer-events-none absolute -bottom-10 right-24 h-32 w-32 -rotate-12 text-white/[0.07]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Academics</p>
              <h1 className="mt-0.5 text-2xl font-bold text-white">Enrolments</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">Track progress, change status and enrol students into courses.</p>
            </div>
            <Button variant="white" icon={Plus} onClick={() => setShowEnroll(true)} className="shrink-0 active:scale-95">New enrolment</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={GraduationCap} label="Enrolments" value={stats.total} />
          <HeaderStat icon={Activity} label="Active" value={stats.active} />
          <HeaderStat icon={CheckCircle2} label="Completed" value={stats.completed} />
          <HeaderStat icon={TrendingUp} label="Avg progress" value={`${stats.avg}%`} />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Row 1 — search + course filter + actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="group relative lg:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student or course…"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-accent focus:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--color-accent)_16%,transparent)]"
            />
          </div>
          <div className="w-full lg:w-56">
            <CustomSelect value={courseFilter} onChange={setCourseFilter} options={courseOptions} placeholder="All courses" searchPlaceholder="Search courses…" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={RefreshCw} onClick={refetch} className={cn('active:scale-95', loading && '[&_svg]:animate-spin')}>Refresh</Button>
            <div className="inline-flex shrink-0 overflow-hidden rounded-xl border border-border bg-card">
              {VIEWS.map((v, idx) => {
                const active = view === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
                    title={`${v.label} view`}
                    className={cn('relative isolate grid h-10 w-10 place-items-center transition-colors duration-200', idx > 0 && 'border-l border-border', active ? 'text-accent-foreground' : 'text-muted-foreground hover:text-accent')}
                  >
                    {active && <motion.span layoutId="enrollmentsViewActive" className="absolute inset-0 -z-10 bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                    <v.Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2 — status filters */}
        <div className="flex flex-wrap items-center gap-2">
          {pills.map((p) => {
            const active = statusFilter === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setStatusFilter(p.value)}
                className={cn('relative isolate inline-flex items-center gap-1.5 rounded-none border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-95', active ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground')}
              >
                {active && <motion.span layoutId="enrollmentsStatusActive" className="absolute inset-0 -z-10 rounded-none" style={accentTint(0.1)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                {p.label}
                <span className={cn('text-xs', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {error && rows.length === 0 ? (
        <Card className="text-sm text-danger">Couldn&apos;t load enrolments: {error.message}</Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No enrolments yet"
          description="Enrol students into a course to get started."
          action={<Button icon={Plus} onClick={() => setShowEnroll(true)}>New enrolment</Button>}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="No matching enrolments" description="Try a different search or filter." />
            ) : view === 'list' ? (
              /* TABLE */
              <Card className="overflow-hidden p-0">
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <SortHeader label="Student" sortKey="student" sort={sort} onSort={onSort} />
                        <SortHeader label="Course" sortKey="course" sort={sort} onSort={onSort} />
                        <SortHeader label="Progress" sortKey="progress" sort={sort} onSort={onSort} />
                        <SortHeader label="Enrolled" sortKey="enrolled" sort={sort} onSort={onSort} />
                        <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((r) => (
                        <EnrollmentTableRow key={r._id} row={r} onChangeStatus={changeStatus} onUnenroll={handleUnenroll} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* mobile cards */}
                <div className="divide-y divide-border lg:hidden">
                  {sorted.map((r) => (
                    <EnrollmentMobileRow key={r._id} row={r} onChangeStatus={changeStatus} onUnenroll={handleUnenroll} />
                  ))}
                </div>
              </Card>
            ) : (
              /* GRID */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence>
                  {sorted.map((r) => (
                    <EnrollmentCard key={r._id} row={r} onChangeStatus={changeStatus} onUnenroll={handleUnenroll} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <EnrollModal open={showEnroll} onClose={() => setShowEnroll(false)} onSaved={() => refetch()} />
      <ConfirmDialog
        open={!!unenroll}
        onClose={() => setUnenroll(null)}
        onConfirm={confirmUnenroll}
        loading={removing}
        title="Unenroll student?"
        message={unenroll ? `Remove ${studentName(unenroll.student)} from "${unenroll.course?.title}"? Their progress for this course will be lost.` : ''}
        confirmLabel="Unenroll"
      />
    </div>
  );
}

export default EnrollmentsPage;
