import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, GraduationCap, Clock, CheckCircle, Layers, Search, Grid, List, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../auth/AuthProvider';
import { getMyCourses } from '../../services/lms.service';
import { Button, EmptyState } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import CourseCard from './lms/CourseCard';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

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

export function LearningHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    setError(null);
    getMyCourses()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || 'Failed to load your courses'))
      .finally(() => {
        setLoading(false);
        setLoaded(true);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const inProgress = items.filter((i) => i.progressPercent > 0 && i.progressPercent < 100).length;
    const completed = items.filter((i) => i.status === 'completed' || i.progressPercent >= 100).length;
    const lessonsDone = items.reduce((s, i) => s + (i.completedLessons || 0), 0);
    return { total, inProgress, completed, lessonsDone, notStarted: total - inProgress - completed };
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => {
        const c = i.course || {};
        return [c.title, c.category, c.level, c.summary, c.description, ...(c.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      });
    }
    if (filter !== 'all') {
      list = list.filter((i) => {
        const p = i.progressPercent || 0;
        if (filter === 'completed') return p >= 100 || i.status === 'completed';
        if (filter === 'in-progress') return p > 0 && p < 100;
        if (filter === 'not-started') return p === 0;
        return true;
      });
    }
    list.sort((a, b) => new Date(b.enrolledAt || 0) - new Date(a.enrolledAt || 0));
    return list;
  }, [items, query, filter]);

  const pills = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'in-progress', label: 'In Progress', count: stats.inProgress },
    { value: 'completed', label: 'Completed', count: stats.completed },
    { value: 'not-started', label: 'Not Started', count: stats.notStarted },
  ];

  if (loading && !loaded) return <AdminLoader label="Loading your courses…" />;

  return (
    <div className="w-full space-y-6">
      {/* Gradient header + stats strip */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Learning</p>
            <h1 className="mt-1 text-2xl font-bold text-white">My Learning</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Hi {user?.firstName || 'there'} — pick up where you left off and keep your streak going.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="white" icon={RefreshCw} onClick={load} className={cn(loading && '[&_svg]:animate-spin')}>
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={BookOpen} label="Enrolled" value={stats.total} />
          <HeaderStat icon={Clock} label="In Progress" value={stats.inProgress} />
          <HeaderStat icon={CheckCircle} label="Completed" value={stats.completed} />
          <HeaderStat icon={Layers} label="Lessons done" value={stats.lessonsDone} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your courses…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pills.map((p) => {
            const active = filter === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setFilter(p.value)}
                className={cn(
                  'relative isolate inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="learnStatusActive"
                    className="absolute inset-0 -z-10 rounded-full"
                    style={accentTint(0.1)}
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                {p.label}
                <span className={cn('text-xs', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
              </button>
            );
          })}
          {/* View toggle */}
          <div className="flex overflow-hidden rounded-full border border-border">
            <button
              type="button"
              onClick={() => setView('grid')}
              title="Grid view"
              className={cn('grid h-8 w-9 place-items-center transition-colors', view === 'grid' ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}
              style={view === 'grid' ? accentTint(0.1) : undefined}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              title="List view"
              className={cn('grid h-8 w-9 place-items-center border-l border-border transition-colors', view === 'list' ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}
              style={view === 'list' ? accentTint(0.1) : undefined}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <EmptyState
          icon={BookOpen}
          title="Couldn’t load your courses"
          description={error}
          action={<Button onClick={load}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses yet"
          description="You aren’t enrolled in any courses yet. Contact your administrator to get started."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching courses" description="Try a different search or filter." />
      ) : (
        <motion.div layout className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
          <AnimatePresence>
            {filtered.map((item) => (
              <CourseCard
                key={item.enrollmentId || item.course?._id}
                item={item}
                viewMode={view}
                onOpen={() => navigate(`/learn/${item.course?._id}`)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

export default LearningHomePage;
