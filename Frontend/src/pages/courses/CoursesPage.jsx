import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Layers,
  GraduationCap,
  Star,
  Globe,
  GlobeLock,
  FileEdit,
  ChevronRight,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';
import { Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { CourseService } from '../../services/course.service';
import { CourseFormModal } from './modals/CourseFormModal';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });
const VIEW_KEY = 'coursesView';

// Status chip recipe — text-colour class + tinted background + a solid indicator dot. Saturated
// tints use color-mix inline because the var-based Tailwind tokens can't take a `/opacity` modifier.
const STATUS_META = {
  published: { label: 'Published', cls: 'text-success', bg: 'color-mix(in srgb, var(--color-success) 14%, transparent)', dot: 'var(--color-success)' },
  draft: { label: 'Draft', cls: 'text-warning', bg: 'color-mix(in srgb, var(--color-warning) 14%, transparent)', dot: 'var(--color-warning)' },
  archived: { label: 'Archived', cls: 'text-muted-foreground', bg: 'var(--color-muted)', dot: 'var(--color-mutedForeground)' },
};

const VIEWS = [
  { id: 'list', label: 'Table', Icon: ListIcon },
  { id: 'grid', label: 'Grid', Icon: LayoutGrid },
];

// Rank maps so non-numeric columns sort by a meaningful order rather than alphabetically.
const STATUS_RANK = { published: 0, draft: 1, archived: 2 };
const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };

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

function StatusChip({ status, className, cover }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', m.cls, className)}
      style={{ backgroundColor: cover ? 'var(--color-card)' : m.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.dot }} />
      {m.label}
    </span>
  );
}

function MetaChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

/** Course cover — image when available, otherwise a brand-gradient monogram tile. */
function CourseThumb({ course, className, textClass }) {
  const [imgError, setImgError] = useState(false);
  if (course.coverImageUrl && !imgError) {
    return (
      <img
        src={course.coverImageUrl}
        alt={course.title}
        onError={() => setImgError(true)}
        className={cn('object-cover', className)}
      />
    );
  }
  return (
    <span className={cn('flex items-center justify-center font-bold tracking-tight text-white', textClass, className)} style={{ background: GRADIENT }}>
      {initials(course.title)}
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

const CourseTableRow = memo(function CourseTableRow({ course, onOpen, onEdit, onDelete, onTogglePublish, busy }) {
  return (
    <tr onClick={() => onOpen(course)} className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <CourseThumb course={course} textClass="text-xs" className="h-10 w-12 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <p className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-accent">{course.title}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{course.summary || course.description || 'No description yet.'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5"><StatusChip status={course.status} /></td>
      <td className="px-4 py-3.5 text-sm capitalize text-muted-foreground">{course.level || 'beginner'}</td>
      <td className="px-4 py-3.5 text-center text-sm font-medium tabular-nums text-foreground">{course.totalLessons || 0}</td>
      <td className="px-4 py-3.5 text-center text-sm font-medium tabular-nums text-foreground">{course.enrollmentCount || 0}</td>
      <td className="px-4 py-3.5 text-center text-sm text-muted-foreground">
        {course.averageRating ? (
          <span className="inline-flex items-center gap-1 tabular-nums"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> {course.averageRating}</span>
        ) : '—'}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <IconAction icon={Pencil} title="Edit course" onClick={() => onEdit(course)} />
          <Button
            size="iconSm"
            variant="secondary"
            icon={course.status === 'published' ? Globe : GlobeLock}
            loading={busy}
            onClick={() => onTogglePublish(course)}
            title={course.status === 'published' ? 'Unpublish course' : 'Publish course'}
            aria-label={course.status === 'published' ? 'Unpublish course' : 'Publish course'}
          />
          <IconAction icon={Trash2} title="Delete course" danger onClick={() => onDelete(course)} />
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <Button size="iconSm" icon={ArrowRight} onClick={() => onOpen(course)} title="Manage course" aria-label="Manage course" />
        </div>
      </td>
    </tr>
  );
});

/** Mobile fallback row for the table view. */
const CourseMobileRow = memo(function CourseMobileRow({ course, onOpen, onEdit, onDelete, onTogglePublish, busy }) {
  return (
    <div className="p-4">
      <button type="button" onClick={() => onOpen(course)} className="flex w-full items-center gap-3 text-left">
        <CourseThumb course={course} textClass="text-sm" className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-semibold text-foreground">{course.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusChip status={course.status} />
            <MetaChip icon={BookOpen}>{course.totalLessons || 0}</MetaChip>
            <MetaChip icon={GraduationCap}>{course.enrollmentCount || 0}</MetaChip>
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center gap-2">
        <IconAction icon={Pencil} title="Edit course" onClick={() => onEdit(course)} />
        <IconAction icon={Trash2} title="Delete course" danger onClick={() => onDelete(course)} />
        <Button size="sm" variant="secondary" icon={course.status === 'published' ? Globe : GlobeLock} onClick={() => onTogglePublish(course)} loading={busy} className="flex-1">
          {course.status === 'published' ? 'Unpublish' : 'Publish'}
        </Button>
        <Button size="sm" onClick={() => onOpen(course)} iconRight={ChevronRight} className="flex-1">Manage</Button>
      </div>
    </div>
  );
});

/* ── Grid view card ──────────────────────────────────────────────────────────── */
const CourseCard = memo(function CourseCard({ course, onOpen, onEdit, onDelete, onTogglePublish, busy }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card className="group relative flex h-full flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
        {/* Cover */}
        <button type="button" onClick={() => onOpen(course)} className="relative block aspect-[16/9] w-full overflow-hidden text-left">
          <CourseThumb course={course} textClass="text-3xl" className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          <span className="absolute left-3 top-3">
            <StatusChip status={course.status} cover className="shadow-sm" />
          </span>
          <span className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded-lg bg-card shadow-sm"><IconAction icon={Pencil} title="Edit course" onClick={() => onEdit(course)} /></span>
            <span className="rounded-lg bg-card shadow-sm"><IconAction icon={Trash2} title="Delete course" danger onClick={() => onDelete(course)} /></span>
          </span>
        </button>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          <button type="button" onClick={() => onOpen(course)} className="text-left">
            <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-accent">{course.title}</h3>
            <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">{course.summary || course.description || 'No description yet.'}</p>
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <MetaChip icon={Layers}><span className="capitalize">{course.level || 'beginner'}</span></MetaChip>
            <MetaChip icon={BookOpen}>{course.totalLessons || 0} Lessons</MetaChip>
            <MetaChip icon={GraduationCap}>{course.enrollmentCount || 0}</MetaChip>
            {course.averageRating ? <MetaChip icon={Star}>{course.averageRating}</MetaChip> : null}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            <Button size="sm" variant="secondary" icon={course.status === 'published' ? Globe : GlobeLock} onClick={() => onTogglePublish(course)} loading={busy} className="flex-1">
              {course.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
            <Button size="sm" onClick={() => onOpen(course)} iconRight={ChevronRight} className="flex-1">Manage</Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

export function CoursesPage() {
  const navigate = useNavigate();
  // cacheKey → render instantly from cache on revisit, then revalidate in the background.
  const { data, loading, error, refetch, mutate } = useApi(() => CourseService.list(), [], { cacheKey: 'courses' });
  const courses = useMemo(() => data || [], [data]);

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
  const [toggling, setToggling] = useState(null); // course pending publish/unpublish confirmation
  const [sort, setSort] = useState({ key: null, dir: 'asc' }); // null key = natural (server) order

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.title, c.summary, c.description, c.category, ...(c.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [courses, search, statusFilter]);

  // Client-side sort of the filtered list — no extra API call. `key === null` keeps server order.
  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const valueOf = (c) => {
      switch (sort.key) {
        case 'title': return (c.title || '').toLowerCase();
        case 'status': return STATUS_RANK[c.status] ?? 99;
        case 'level': return LEVEL_RANK[c.level] ?? 0;
        case 'totalLessons': return c.totalLessons || 0;
        case 'enrollmentCount': return c.enrollmentCount || 0;
        case 'averageRating': return c.averageRating || 0;
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
    total: courses.length,
    published: courses.filter((c) => c.status === 'published').length,
    draft: courses.filter((c) => c.status === 'draft').length,
    lessons: courses.reduce((s, c) => s + (c.totalLessons || 0), 0),
  }), [courses]);

  const counts = useMemo(() => ({
    all: courses.length,
    published: stats.published,
    draft: stats.draft,
    archived: courses.filter((c) => c.status === 'archived').length,
  }), [courses, stats]);

  // Optimistically flip status in the local cache, then reconcile with the server's authoritative
  // copy (status/publishedAt/totalLessons) — no list refetch. Rolls back if the request fails.
  const togglePublish = useCallback(async (course) => {
    if (!course) return;
    const id = course._id;
    const wasPublished = course.status === 'published';
    const optimistic = wasPublished ? 'draft' : 'published';
    setBusyId(id);
    mutate((list) => list?.map((c) => (c._id === id ? { ...c, status: optimistic } : c)));
    try {
      const updated = await CourseService.publish(id);
      mutate((list) => list?.map((c) => (c._id === id ? { ...c, ...updated } : c)));
      toast.success(wasPublished ? 'Course unpublished' : 'Course published');
      setToggling(null);
    } catch (e) {
      mutate((list) => list?.map((c) => (c._id === id ? { ...c, status: course.status } : c)));
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
      await CourseService.remove(id);
      mutate((list) => list?.filter((c) => c._id !== id)); // drop locally — no refetch
      toast.success('Course deleted');
      setDeleting(null);
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setRemoving(false);
    }
  }, [deleting, mutate]);

  // Create/edit both return the full saved course → patch the cache in place instead of refetching.
  const handleSaved = useCallback((saved) => {
    if (!saved?._id) { refetch(); return; }
    mutate((list) => {
      const arr = list || [];
      return arr.some((c) => c._id === saved._id)
        ? arr.map((c) => (c._id === saved._id ? { ...c, ...saved } : c))
        : [...arr, saved];
    });
  }, [mutate, refetch]);

  const statusPills = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'published', label: 'Published', count: counts.published },
    { value: 'draft', label: 'Drafts', count: counts.draft },
    { value: 'archived', label: 'Archived', count: counts.archived },
  ];

  // Stable row handlers (each takes the course) so memoized rows re-render only when their own
  // course or busy flag changes — not on every parent render.
  const handleOpen = useCallback((c) => navigate(`/courses/${c._id}`), [navigate]);
  const handleEdit = useCallback((c) => { setEditing(c); setShowForm(true); }, []);
  const handleDelete = useCallback((c) => setDeleting(c), []);
  const handleTogglePublish = useCallback((c) => setToggling(c), []);
  // Toggle direction when re-clicking the active column, otherwise start a new column ascending.
  const onSort = useCallback((key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  if (loading && !data) return <AdminLoader label="Loading courses…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header card — gradient band + integrated stats */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          {/* decorative cover motif */}
          <BookOpen className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rotate-12 text-white/10" />
          <GraduationCap className="pointer-events-none absolute -bottom-10 right-24 h-32 w-32 -rotate-12 text-white/[0.07]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Academics</p>
              <h1 className="mt-0.5 text-2xl font-bold text-white">Courses</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">Create, organise and publish your courses.</p>
            </div>
            <Button variant="white" icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }} className="shrink-0 active:scale-95">New course</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={BookOpen} label="Courses" value={stats.total} />
          <HeaderStat icon={Globe} label="Published" value={stats.published} />
          <HeaderStat icon={FileEdit} label="Drafts" value={stats.draft} />
          <HeaderStat icon={Layers} label="Total lessons" value={stats.lessons} />
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
              placeholder="Search courses…"
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
                    {active && <motion.span layoutId="coursesViewActive" className="absolute inset-0 -z-10 bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
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
                {active && <motion.span layoutId="coursesStatusActive" className="absolute inset-0 -z-10 rounded-none" style={accentTint(0.1)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                {p.label}
                <span className={cn('text-xs', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {error && courses.length === 0 ? (
        <Card className="text-sm text-danger">Couldn&apos;t load courses: {error.message}</Card>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course, then add modules and upload resources for your students."
          action={<Button icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>Create your first course</Button>}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="No matching courses" description="Try a different search or filter." />
            ) : view === 'list' ? (
              /* TABLE */
              <Card className="overflow-hidden p-0">
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <SortHeader label="Course" sortKey="title" sort={sort} onSort={onSort} />
                        <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                        <SortHeader label="Level" sortKey="level" sort={sort} onSort={onSort} />
                        <SortHeader label="Lessons" sortKey="totalLessons" sort={sort} onSort={onSort} align="center" />
                        <SortHeader label="Students" sortKey="enrollmentCount" sort={sort} onSort={onSort} align="center" />
                        <SortHeader label="Rating" sortKey="averageRating" sort={sort} onSort={onSort} align="center" />
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((c) => (
                        <CourseTableRow key={c._id} course={c} busy={busyId === c._id} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} onTogglePublish={handleTogglePublish} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* mobile cards */}
                <div className="divide-y divide-border md:hidden">
                  {sorted.map((c) => (
                    <CourseMobileRow key={c._id} course={c} busy={busyId === c._id} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} onTogglePublish={handleTogglePublish} />
                  ))}
                </div>
              </Card>
            ) : (
              /* GRID */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence>
                  {sorted.map((c) => (
                    <CourseCard key={c._id} course={c} busy={busyId === c._id} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} onTogglePublish={handleTogglePublish} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <CourseFormModal open={showForm} onClose={() => setShowForm(false)} course={editing} onSaved={handleSaved} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={removing}
        title="Delete course?"
        message={`"${deleting?.title}" and all its modules, resources and uploaded files will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete course"
      />
      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={() => togglePublish(toggling)}
        loading={busyId === toggling?._id}
        tone="primary"
        title={toggling?.status === 'published' ? 'Unpublish course?' : 'Publish course?'}
        message={
          toggling?.status === 'published'
            ? `"${toggling?.title}" will be hidden from students until you publish it again.`
            : `"${toggling?.title}" will become visible to students and they can enrol.`
        }
        confirmLabel={toggling?.status === 'published' ? 'Unpublish' : 'Publish'}
      />
    </div>
  );
}

export default CoursesPage;
