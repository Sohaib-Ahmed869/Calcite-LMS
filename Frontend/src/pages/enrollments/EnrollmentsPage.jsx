import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Card, Badge, Avatar, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { CustomSelect } from '../../admin-ui/CustomSelect';
import { AdminLoader } from '../../admin-ui/Loader';
import { EnrollmentService } from '../../services/enrollment.service';
import { EnrollModal } from './modals/EnrollModal';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

const STATUS_META = {
  active: { label: 'Active', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'warning' },
  withdrawn: { label: 'Withdrawn', tone: 'muted' },
};
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'completed', label: 'Completed' },
];

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

function ProgressBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${value || 0}%` }} />
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{value || 0}%</span>
    </div>
  );
}

export function EnrollmentsPage() {
  const { data, loading, error, refetch } = useApi(() => EnrollmentService.list(), []);
  const rows = useMemo(() => data || [], [data]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [showEnroll, setShowEnroll] = useState(false);
  const [unenroll, setUnenroll] = useState(null);
  const [removing, setRemoving] = useState(false);

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

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    completed: rows.filter((r) => r.status === 'completed').length,
    avg: rows.length ? Math.round(rows.reduce((s, r) => s + (r.progressPercent || 0), 0) / rows.length) : 0,
  }), [rows]);

  const pills = [
    { value: 'all', label: 'All', count: rows.length },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'completed', label: 'Completed', count: stats.completed },
    { value: 'suspended', label: 'Suspended', count: rows.filter((r) => r.status === 'suspended').length },
    { value: 'withdrawn', label: 'Withdrawn', count: rows.filter((r) => r.status === 'withdrawn').length },
  ];

  const changeStatus = async (row, status) => {
    if (status === row.status) return;
    try {
      await EnrollmentService.setStatus(row._id, status);
      toast.success('Enrolment updated');
      refetch();
    } catch (e) {
      toast.error(e.message || 'Failed to update');
    }
  };

  const confirmUnenroll = async () => {
    if (!unenroll) return;
    setRemoving(true);
    try {
      await EnrollmentService.remove(unenroll._id);
      toast.success('Unenrolled');
      setUnenroll(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Failed to unenroll');
    } finally {
      setRemoving(false);
    }
  };

  const studentName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || 'Student';

  if (loading && !data) return <AdminLoader label="Loading enrolments…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Academics</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Enrolments</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">See who&apos;s enrolled in what, track progress, change status, and enrol students into courses.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="white" icon={RefreshCw} onClick={refetch} className={cn(loading && '[&_svg]:animate-spin')}>Refresh</Button>
            <Button variant="white" icon={Plus} onClick={() => setShowEnroll(true)}>New enrolment</Button>
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student or course…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
        </div>
        <div className="w-full sm:w-56">
          <CustomSelect value={courseFilter} onChange={setCourseFilter} options={courseOptions} placeholder="All courses" searchPlaceholder="Search courses…" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pills.map((p) => {
          const active = statusFilter === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setStatusFilter(p.value)}
              className={cn('relative isolate inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors', active ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground')}
            >
              {active && <motion.span layoutId="enrollStatusActive" className="absolute inset-0 -z-10 rounded-full" style={accentTint(0.1)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
              {p.label}
              <span className={cn('text-xs', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {error ? (
        <Card className="text-sm text-danger">Couldn&apos;t load enrolments: {error.message}</Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No enrolments yet"
          description="Enrol students into a course to get started."
          action={<Button icon={Plus} onClick={() => setShowEnroll(true)}>New enrolment</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching enrolments" description="Try a different search or filter." />
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Course</th>
                  <th className="px-4 py-3.5">Progress</th>
                  <th className="px-4 py-3.5">Enrolled</th>
                  <th className="px-4 py-3.5 w-40">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link to={`/students/${r.student?._id}`} className="group flex items-center gap-3">
                        <Avatar name={studentName(r.student)} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground group-hover:text-accent">{studentName(r.student)}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.student?.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/courses/${r.course?._id}`} className="inline-flex items-center gap-2 text-foreground hover:text-accent">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="max-w-[220px] truncate">{r.course?.title}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><ProgressBar value={r.progressPercent} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(r.enrolledAt)}</td>
                    <td className="px-4 py-3">
                      <CustomSelect value={r.status} onChange={(v) => changeStatus(r, v)} options={STATUS_OPTIONS} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={() => setUnenroll(r)} title="Unenroll" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-border lg:hidden">
            {filtered.map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.active;
              return (
                <div key={r._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={studentName(r.student)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/students/${r.student?._id}`} className="block truncate font-medium text-foreground">{studentName(r.student)}</Link>
                      <Link to={`/courses/${r.course?._id}`} className="mt-0.5 block truncate text-xs text-muted-foreground">{r.course?.title}</Link>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <div className="mt-2.5"><ProgressBar value={r.progressPercent} /></div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1"><CustomSelect value={r.status} onChange={(v) => changeStatus(r, v)} options={STATUS_OPTIONS} /></div>
                    <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={() => setUnenroll(r)} title="Unenroll" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
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
