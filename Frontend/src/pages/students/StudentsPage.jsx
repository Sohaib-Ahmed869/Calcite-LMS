import { useMemo, useState } from 'react';
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
  Power,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Card, Badge, Avatar, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { StudentService } from '../../services/student.service';
import { StudentFormModal } from './modals/StudentFormModal';

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

function StatusChip({ active }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', active ? 'text-success' : 'text-muted-foreground')} style={{ backgroundColor: active ? 'rgba(46,125,50,0.12)' : 'var(--color-muted)' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? '#2e7d32' : 'var(--color-mutedForeground)' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function StudentsPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => StudentService.list(), []);
  const students = useMemo(() => data || [], [data]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      if (!q) return true;
      return [s.displayName, s.firstName, s.lastName, s.email].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [students, search, statusFilter]);

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter((s) => s.isActive).length,
    inactive: students.filter((s) => !s.isActive).length,
    enrollments: students.reduce((n, s) => n + (s.enrollmentCount || 0), 0),
  }), [students]);

  const pills = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'inactive', label: 'Inactive', count: stats.inactive },
  ];

  const toggleStatus = async (s) => {
    setBusyId(s._id);
    try {
      await StudentService.setStatus(s._id, !s.isActive);
      toast.success(s.isActive ? 'Student deactivated' : 'Student activated');
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
      await StudentService.remove(deleting._id);
      toast.success('Student deleted');
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setRemoving(false);
    }
  };

  if (loading && !data) return <AdminLoader label="Loading students…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Academics</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Students</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">Create and manage student accounts, enrol them into courses, and track their progress.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="white" icon={RefreshCw} onClick={refetch} className={cn(loading && '[&_svg]:animate-spin')}>Refresh</Button>
            <Button variant="white" icon={UserPlus} onClick={() => { setEditing(null); setShowForm(true); }}>Add student</Button>
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
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
                {active && <motion.span layoutId="studentsStatusActive" className="absolute inset-0 -z-10 rounded-full" style={accentTint(0.1)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                {p.label}
                <span className={cn('text-xs', active ? 'text-accent/70' : 'text-muted-foreground')}>{p.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {error ? (
        <Card className="text-sm text-danger">Couldn&apos;t load students: {error.message}</Card>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Add your first student account, then enrol them into courses."
          action={<Button icon={UserPlus} onClick={() => { setEditing(null); setShowForm(true); }}>Add your first student</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching students" description="Try a different search or filter." />
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Enrolments</th>
                  <th className="px-4 py-3.5">Completed</th>
                  <th className="px-4 py-3.5">Joined</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id} className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40" onClick={() => navigate(`/students/${s._id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.displayName} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground group-hover:text-accent">{s.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">{s.enrollmentCount || 0}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 tabular-nums text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{s.completedCount || 0}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3"><StatusChip active={s.isActive} /></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="iconSm" variant="ghost" icon={Power} loading={busyId === s._id} onClick={() => toggleStatus(s)} title={s.isActive ? 'Deactivate' : 'Activate'} />
                        <Button size="iconSm" variant="ghost" icon={Pencil} onClick={() => { setEditing(s); setShowForm(true); }} title="Edit" />
                        <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={() => setDeleting(s)} title="Delete" />
                        <Button size="iconSm" variant="ghost" icon={ChevronRight} onClick={() => navigate(`/students/${s._id}`)} title="Manage" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-border md:hidden">
            {filtered.map((s) => (
              <button key={s._id} type="button" onClick={() => navigate(`/students/${s._id}`)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40">
                <Avatar name={s.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.enrollmentCount || 0} enrolments · joined {formatDate(s.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusChip active={s.isActive} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <StudentFormModal open={showForm} onClose={() => setShowForm(false)} student={editing} onSaved={() => refetch()} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={removing}
        title="Delete student?"
        message={`"${deleting?.displayName}" and all their enrolments, progress and certificates will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete student"
      />
    </div>
  );
}

export default StudentsPage;
