import { useMemo, useState } from 'react';
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
  FileEdit,
  Archive,
  ChevronRight,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cn } from '../../lib/cn';
import { Card, Badge, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { CourseService } from '../../services/course.service';
import { CourseFormModal } from './modals/CourseFormModal';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

const STATUS_META = {
  published: { label: 'Published', tone: 'success', Icon: Globe },
  draft: { label: 'Draft', tone: 'warning', Icon: FileEdit },
  archived: { label: 'Archived', tone: 'muted', Icon: Archive },
};

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

function CourseCard({ course, onOpen, onEdit, onDelete, onTogglePublish, busy }) {
  const meta = STATUS_META[course.status] || STATUS_META.draft;
  const [imgError, setImgError] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card className="group flex h-full flex-col overflow-hidden p-0">
        {/* Cover */}
        <button type="button" onClick={onOpen} className="relative block aspect-[16/9] w-full overflow-hidden text-left">
          {course.coverImageUrl && !imgError ? (
            <img src={course.coverImageUrl} alt={course.title} onError={() => setImgError(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <span className="flex h-full w-full items-center justify-center" style={{ background: GRADIENT }}>
              <BookOpen className="h-10 w-10 text-white/80" />
            </span>
          )}
          <span className="absolute left-3 top-3">
            <Badge tone={meta.tone}><meta.Icon className="h-3 w-3" /> {meta.label}</Badge>
          </span>
          {/* hover actions */}
          <span className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onEdit(); }} onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onEdit())} className="grid h-8 w-8 place-items-center rounded-lg bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-accent" title="Edit course">
              <Pencil className="h-4 w-4" />
            </span>
            <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onDelete(); }} onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onDelete())} className="grid h-8 w-8 place-items-center rounded-lg bg-card/90 text-danger shadow-sm backdrop-blur transition-colors hover:opacity-80" title="Delete course">
              <Trash2 className="h-4 w-4" />
            </span>
          </span>
        </button>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          <button type="button" onClick={onOpen} className="text-left">
            <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-accent">{course.title}</h3>
            <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">{course.summary || course.description || 'No description yet.'}</p>
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 capitalize"><Layers className="h-3.5 w-3.5" /> {course.level || 'beginner'}</span>
            <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.totalLessons || 0} lessons</span>
            <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {course.enrollmentCount || 0}</span>
            {course.averageRating ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> {course.averageRating}</span> : null}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            <Button size="sm" variant="secondary" onClick={onTogglePublish} loading={busy} className="flex-1">
              {course.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
            <Button size="sm" onClick={onOpen} iconRight={ChevronRight} className="flex-1">Manage</Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function CoursesPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => CourseService.list(), []);
  const courses = useMemo(() => data || [], [data]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.title, c.summary, c.description, c.category, ...(c.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [courses, search, statusFilter]);

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

  const togglePublish = async (course) => {
    setBusyId(course._id);
    try {
      await CourseService.publish(course._id);
      toast.success(course.status === 'published' ? 'Course unpublished' : 'Course published');
      refetch();
    } catch (e) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await CourseService.remove(deleting._id);
      toast.success('Course deleted');
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setRemoving(false);
    }
  };

  const statusPills = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'published', label: 'Published', count: counts.published },
    { value: 'draft', label: 'Drafts', count: counts.draft },
    { value: 'archived', label: 'Archived', count: counts.archived },
  ];

  if (loading && !data) return <AdminLoader label="Loading courses…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Academics</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Courses</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">Build your catalogue — create courses, organise them into modules, and upload resources for students.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="white" icon={RefreshCw} onClick={refetch} className={cn(loading && '[&_svg]:animate-spin')}>Refresh</Button>
            <Button variant="white" icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>New course</Button>
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusPills.map((p) => {
            const active = statusFilter === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setStatusFilter(p.value)}
                className={cn('relative isolate inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors', active ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground')}
              >
                {active && <motion.span layoutId="coursesStatusActive" className="absolute inset-0 -z-10 rounded-full" style={accentTint(0.1)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                {p.label}
                <span className={cn('text-xs', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {error ? (
        <Card className="text-sm text-danger">Couldn&apos;t load courses: {error.message}</Card>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course, then add modules and upload resources for your students."
          action={<Button icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>Create your first course</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching courses" description="Try a different search or filter." />
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((c) => (
              <CourseCard
                key={c._id}
                course={c}
                busy={busyId === c._id}
                onOpen={() => navigate(`/courses/${c._id}`)}
                onEdit={() => { setEditing(c); setShowForm(true); }}
                onDelete={() => setDeleting(c)}
                onTogglePublish={() => togglePublish(c)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CourseFormModal open={showForm} onClose={() => setShowForm(false)} course={editing} onSaved={() => refetch()} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={removing}
        title="Delete course?"
        message={`"${deleting?.title}" and all its modules, resources and uploaded files will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete course"
      />
    </div>
  );
}

export default CoursesPage;
