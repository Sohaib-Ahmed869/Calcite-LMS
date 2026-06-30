import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  GraduationCap,
  CheckCircle2,
  UserCheck,
  UserX,
  ChevronRight,
  ArrowRight,
  Power,
  Mail,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Avatar, Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { StudentService } from '../../services/student.service';
import { StudentFormModal } from './modals/StudentFormModal';

const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });
const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const VIEW_KEY = 'studentsView';

const VIEWS = [
  { id: 'list', label: 'Table', Icon: ListIcon },
  { id: 'grid', label: 'Grid', Icon: LayoutGrid },
];

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

/** Active/Inactive pill — tinted from the success token so it follows the live theme. */
function StatusChip({ active, className }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', active ? 'text-success' : 'text-muted-foreground', className)}
      style={{ backgroundColor: active ? 'color-mix(in srgb, var(--color-success) 14%, transparent)' : 'var(--color-muted)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? 'var(--color-success)' : 'var(--color-mutedForeground)' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function MetaChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Icon className="h-2.5 w-2.5 shrink-0" /> {children}
    </span>
  );
}

/** Ghost edit/delete icon buttons, shared across views. */
function IconAction({ icon: Icon, title, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors',
        danger ? 'hover:bg-muted hover:text-danger' : 'hover:bg-muted hover:text-accent',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/* ── Table view ──────────────────────────────────────────────────────────────── */
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

const StudentTableRow = memo(function StudentTableRow({ student, onOpen, onEdit, onDelete, onToggle, busy }) {
  return (
    <tr onClick={() => onOpen(student)} className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={student.displayName} src={student.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-accent">{student.displayName}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{student.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm font-medium tabular-nums text-foreground">{student.enrollmentCount || 0}</td>
      <td className="px-4 py-3 text-center text-sm">
        <span className="inline-flex items-center gap-1.5 tabular-nums text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{student.completedCount || 0}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatDate(student.createdAt)}</td>
      <td className="px-4 py-3"><StatusChip active={student.isActive} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <IconAction icon={Pencil} title="Edit student" onClick={() => onEdit(student)} />
          <Button
            size="iconSm"
            variant="secondary"
            icon={Power}
            loading={busy}
            onClick={() => onToggle(student)}
            title={student.isActive ? 'Deactivate' : 'Activate'}
            aria-label={student.isActive ? 'Deactivate student' : 'Activate student'}
          />
          <IconAction icon={Trash2} title="Delete student" danger onClick={() => onDelete(student)} />
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <Button size="iconSm" icon={ArrowRight} onClick={() => onOpen(student)} title="Manage student" aria-label="Manage student" />
        </div>
      </td>
    </tr>
  );
});

/** Mobile fallback row for the table view. */
const StudentMobileRow = memo(function StudentMobileRow({ student, onOpen, onEdit, onDelete, onToggle, busy }) {
  return (
    <div className="p-4">
      <button type="button" onClick={() => onOpen(student)} className="flex w-full items-center gap-3 text-left">
        <Avatar name={student.displayName} src={student.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-semibold text-foreground">{student.displayName}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{student.email}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusChip active={student.isActive} />
            <MetaChip icon={GraduationCap}>{student.enrollmentCount || 0}</MetaChip>
            <MetaChip icon={CheckCircle2}>{student.completedCount || 0}</MetaChip>
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center gap-2">
        <IconAction icon={Pencil} title="Edit student" onClick={() => onEdit(student)} />
        <IconAction icon={Trash2} title="Delete student" danger onClick={() => onDelete(student)} />
        <Button size="sm" variant="secondary" icon={Power} onClick={() => onToggle(student)} loading={busy} className="flex-1">
          {student.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button size="sm" onClick={() => onOpen(student)} iconRight={ChevronRight} className="flex-1">Manage</Button>
      </div>
    </div>
  );
});

/* ── Grid view card ──────────────────────────────────────────────────────────── */
const StudentCard = memo(function StudentCard({ student, onOpen, onEdit, onDelete, onToggle, busy }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="h-full">
      <Card className="group relative flex h-full flex-col p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
        {/* hover edit/delete */}
        <span className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-lg bg-card shadow-sm"><IconAction icon={Pencil} title="Edit student" onClick={() => onEdit(student)} /></span>
          <span className="rounded-lg bg-card shadow-sm"><IconAction icon={Trash2} title="Delete student" danger onClick={() => onDelete(student)} /></span>
        </span>

        {/* Identity */}
        <button type="button" onClick={() => onOpen(student)} className="flex items-start gap-3 p-4 text-left">
          <Avatar name={student.displayName} src={student.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1 pr-12">
            <p className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-accent">{student.displayName}</p>
            <p className="mt-0.5 line-clamp-1 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" />{student.email}</p>
            <div className="mt-2"><StatusChip active={student.isActive} /></div>
          </div>
        </button>

        {/* Body */}
        <div className="flex flex-1 flex-col px-4 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <MetaChip icon={GraduationCap}>{student.enrollmentCount || 0} Enrolled</MetaChip>
            <MetaChip icon={CheckCircle2}>{student.completedCount || 0} Done</MetaChip>
            <MetaChip icon={CalendarDays}>{formatDate(student.createdAt)}</MetaChip>
          </div>

          <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
            <Button size="sm" variant="secondary" icon={Power} onClick={() => onToggle(student)} loading={busy} className="flex-1">
              {student.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button size="sm" onClick={() => onOpen(student)} iconRight={ChevronRight} className="flex-1">Manage</Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

export function StudentsPage() {
  const navigate = useNavigate();
  // cacheKey → render instantly from cache on revisit, then revalidate in the background.
  const { data, loading, error, refetch, mutate } = useApi(() => StudentService.list(), [], { cacheKey: 'students' });
  const students = useMemo(() => data || [], [data]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || 'list'; } catch { return 'list'; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toggling, setToggling] = useState(null); // student pending activate/deactivate confirmation
  const [sort, setSort] = useState({ key: null, dir: 'asc' }); // null key = natural (server) order

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      if (!q) return true;
      return [s.displayName, s.firstName, s.lastName, s.email].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [students, search, statusFilter]);

  // Client-side sort of the filtered list — no extra API call. `key === null` keeps server order.
  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const valueOf = (s) => {
      switch (sort.key) {
        case 'name': return (s.displayName || '').toLowerCase();
        case 'enrollmentCount': return s.enrollmentCount || 0;
        case 'completedCount': return s.completedCount || 0;
        case 'createdAt': return new Date(s.createdAt).getTime() || 0;
        case 'status': return s.isActive ? 0 : 1;
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
    total: students.length,
    active: students.filter((s) => s.isActive).length,
    inactive: students.filter((s) => !s.isActive).length,
    enrollments: students.reduce((n, s) => n + (s.enrollmentCount || 0), 0),
  }), [students]);

  // Optimistically flip isActive in the local cache, reconcile with the server's copy, roll back on error.
  const toggleStatus = useCallback(async (student) => {
    if (!student) return;
    const id = student._id;
    const wasActive = student.isActive;
    setBusyId(id);
    mutate((list) => list?.map((s) => (s._id === id ? { ...s, isActive: !wasActive } : s)));
    try {
      const updated = await StudentService.setStatus(id, !wasActive);
      mutate((list) => list?.map((s) => (s._id === id ? { ...s, ...updated } : s)));
      toast.success(wasActive ? 'Student deactivated' : 'Student activated');
      setToggling(null);
    } catch (e) {
      mutate((list) => list?.map((s) => (s._id === id ? { ...s, isActive: wasActive } : s)));
      toast.error(e.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  }, [mutate]);

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    const id = deleting._id;
    setRemoving(true);
    try {
      await StudentService.remove(id);
      mutate((list) => list?.filter((s) => s._id !== id)); // drop locally — no refetch
      toast.success('Student deleted');
      setDeleting(null);
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setRemoving(false);
    }
  }, [deleting, mutate]);

  // Create/edit return the saved student → patch the cache in place instead of refetching.
  const handleSaved = useCallback((saved) => {
    if (!saved?._id) { refetch(); return; }
    mutate((list) => {
      const arr = list || [];
      return arr.some((s) => s._id === saved._id)
        ? arr.map((s) => (s._id === saved._id ? { ...s, ...saved } : s))
        : [saved, ...arr];
    });
  }, [mutate, refetch]);

  const statusPills = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'inactive', label: 'Inactive', count: stats.inactive },
  ];

  // Stable row handlers (each takes the student) so memoized rows re-render only when their own
  // student or busy flag changes — not on every parent render.
  const handleOpen = useCallback((s) => navigate(`/students/${s._id}`), [navigate]);
  const handleEdit = useCallback((s) => { setEditing(s); setShowForm(true); }, []);
  const handleDelete = useCallback((s) => setDeleting(s), []);
  const handleToggle = useCallback((s) => setToggling(s), []);
  const onSort = useCallback((key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  if (loading && !data) return <AdminLoader label="Loading students…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header card — gradient band + integrated stats */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          {/* decorative motif */}
          <Users className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rotate-12 text-white/10" />
          <GraduationCap className="pointer-events-none absolute -bottom-10 right-24 h-32 w-32 -rotate-12 text-white/[0.07]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Academics</p>
              <h1 className="mt-0.5 text-2xl font-bold text-white">Students</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">Create, manage and enrol your students.</p>
            </div>
            <Button variant="white" icon={UserPlus} onClick={() => { setEditing(null); setShowForm(true); }} className="shrink-0 active:scale-95">Add student</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={Users} label="Students" value={stats.total} />
          <HeaderStat icon={UserCheck} label="Active" value={stats.active} />
          <HeaderStat icon={UserX} label="Inactive" value={stats.inactive} />
          <HeaderStat icon={GraduationCap} label="Enrolments" value={stats.enrollments} />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Row 1 — search + primary actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="group relative sm:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-accent focus:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--color-accent)_16%,transparent)]"
            />
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
                    {active && <motion.span layoutId="studentsViewActive" className="absolute inset-0 -z-10 bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                    <v.Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2 — status filters */}
        <div className="flex flex-wrap items-center gap-2">
          {statusPills.map((p) => {
            const active = statusFilter === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setStatusFilter(p.value)}
                className={cn('relative isolate inline-flex items-center gap-1.5 rounded-none border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-95', active ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground')}
              >
                {active && <motion.span layoutId="studentsStatusActive" className="absolute inset-0 -z-10 rounded-none" style={accentTint(0.1)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                {p.label}
                <span className={cn('text-xs', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {error && students.length === 0 ? (
        <Card className="text-sm text-danger">Couldn&apos;t load students: {error.message}</Card>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Add your first student account, then enrol them into courses."
          action={<Button icon={UserPlus} onClick={() => { setEditing(null); setShowForm(true); }}>Add your first student</Button>}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="No matching students" description="Try a different search or filter." />
            ) : view === 'list' ? (
              /* TABLE */
              <Card className="overflow-hidden p-0">
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <SortHeader label="Student" sortKey="name" sort={sort} onSort={onSort} />
                        <SortHeader label="Enrolments" sortKey="enrollmentCount" sort={sort} onSort={onSort} align="center" />
                        <SortHeader label="Completed" sortKey="completedCount" sort={sort} onSort={onSort} align="center" />
                        <SortHeader label="Joined" sortKey="createdAt" sort={sort} onSort={onSort} />
                        <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((s) => (
                        <StudentTableRow key={s._id} student={s} busy={busyId === s._id} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* mobile cards */}
                <div className="divide-y divide-border md:hidden">
                  {sorted.map((s) => (
                    <StudentMobileRow key={s._id} student={s} busy={busyId === s._id} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
                  ))}
                </div>
              </Card>
            ) : (
              /* GRID */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence>
                  {sorted.map((s) => (
                    <StudentCard key={s._id} student={s} busy={busyId === s._id} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <StudentFormModal open={showForm} onClose={() => setShowForm(false)} student={editing} onSaved={handleSaved} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={removing}
        title="Delete student?"
        message={`"${deleting?.displayName}" and all their enrolments, progress and certificates will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete student"
      />
      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={() => toggleStatus(toggling)}
        loading={busyId === toggling?._id}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        title={toggling?.isActive ? 'Deactivate student?' : 'Activate student?'}
        message={
          toggling?.isActive
            ? `"${toggling?.displayName}" will lose access to the portal until you reactivate them.`
            : `"${toggling?.displayName}" will regain access to the portal and their courses.`
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}

export default StudentsPage;
