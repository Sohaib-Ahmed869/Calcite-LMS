import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  CalendarDays,
  ShieldCheck,
  Pencil,
  KeyRound,
  Power,
  Trash2,
  GraduationCap,
  CheckCircle2,
  BookOpen,
  Plus,
  Users,
} from 'lucide-react';
import { formatDate } from '../../lib/format';
import { Card, Avatar, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { CustomSelect } from '../../admin-ui/CustomSelect';
import { AdminLoader } from '../../admin-ui/Loader';
import { ENR_STATUS_META as ENR_META, EnrollmentStatusMenu as StatusMenu } from '../../admin-ui/EnrollmentStatusMenu';
import { StudentService } from '../../services/student.service';
import { CourseService } from '../../services/course.service';
import { StudentFormModal } from './modals/StudentFormModal';
import { ResetPasswordModal } from './modals/ResetPasswordModal';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

// Per-student cache ({ student, courses }), kept OUTSIDE React so revisiting a student renders
// instantly while it revalidates in the background — no loader flash on every visit.
const detailCache = new Map();

/* ── Small pieces ────────────────────────────────────────────────────────────── */
function HeroChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-inset ring-white/20">
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value || '—'}</p>
      </div>
    </div>
  );
}

const EnrollmentRow = memo(function EnrollmentRow({ enrollment, onChangeStatus, onUnenroll, busy }) {
  const course = enrollment.course || {};
  const pct = enrollment.progressPercent || 0;
  const strip = (ENR_META[enrollment.status] || ENR_META.active).dot;
  return (
    <div
      className="relative flex flex-col gap-3 rounded-xl border border-l-4 border-border bg-card p-3 transition-shadow hover:shadow-soft sm:flex-row sm:items-center"
      style={{ borderLeftColor: strip }}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg text-accent" style={accentTint(0.12)}>
        {course.coverImageUrl ? <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <Link to={`/courses/${course._id}`} className="line-clamp-1 text-sm font-semibold text-foreground hover:text-accent">{course.title || 'Untitled course'}</Link>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Enrolled {formatDate(enrollment.enrolledAt)}{enrollment.completedAt ? ` · completed ${formatDate(enrollment.completedAt)}` : ''}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="w-36"><StatusMenu value={enrollment.status} onChange={(v) => onChangeStatus(enrollment, v)} /></div>
        <Button size="iconSm" variant="dangerGhost" icon={Trash2} loading={busy} onClick={() => onUnenroll(enrollment)} title="Unenroll" />
      </div>
    </div>
  );
});

export function StudentDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const cached = detailCache.get(studentId);
  const [student, setStudent] = useState(cached?.student ?? null);
  const [courses, setCourses] = useState(cached?.courses ?? []);
  const [loading, setLoading] = useState(!cached); // only "loading" when there's nothing cached
  const [error, setError] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [unenrollTarget, setUnenrollTarget] = useState(null);
  const [unenrolling, setUnenrolling] = useState(null);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, cs] = await Promise.all([StudentService.get(studentId), CourseService.list().catch(() => [])]);
      setStudent(s);
      setCourses(cs || []);
    } catch (e) {
      setError(e.message || 'Failed to load student');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  // Mirror the on-screen data into the cache so a later revisit shows the latest instantly.
  // Guard on _id so we never store one student's data under another student's id mid-navigation.
  useEffect(() => {
    if (student && String(student._id) === studentId) detailCache.set(studentId, { student, courses });
  }, [studentId, student, courses]);

  const reloadStudent = useCallback(() => StudentService.get(studentId).then(setStudent).catch(() => {}), [studentId]);

  const enrollments = student?.enrollments || [];
  const enrolledIds = useMemo(() => new Set(enrollments.map((e) => String(e.course?._id))), [enrollments]);
  const availableCourses = useMemo(
    () => courses.filter((c) => !enrolledIds.has(String(c._id))).map((c) => ({ value: c._id, label: c.title })),
    [courses, enrolledIds],
  );
  const stats = useMemo(() => ({
    total: enrollments.length,
    completed: enrollments.filter((e) => e.status === 'completed').length,
    active: enrollments.filter((e) => e.status === 'active').length,
    avg: enrollments.length ? Math.round(enrollments.reduce((s, e) => s + (e.progressPercent || 0), 0) / enrollments.length) : 0,
  }), [enrollments]);

  const doEnroll = async () => {
    if (!enrollCourseId) return;
    setEnrolling(true);
    try {
      await StudentService.enroll(studentId, enrollCourseId);
      toast.success('Student enrolled');
      setEnrollCourseId('');
      reloadStudent(); // need the server-populated course on the new enrolment
    } catch (e) {
      toast.error(e.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  // Optimistically patch the local enrolment, reconcile only on failure — no full refetch.
  const changeEnrollmentStatus = useCallback(async (enr, status) => {
    if (status === enr.status) return;
    const prev = enr.status;
    setStudent((s) => ({ ...s, enrollments: (s.enrollments || []).map((e) => (e._id === enr._id ? { ...e, status } : e)) }));
    try {
      await StudentService.setEnrollmentStatus(enr._id, status);
      toast.success('Enrolment updated');
    } catch (e) {
      setStudent((s) => ({ ...s, enrollments: (s.enrollments || []).map((x) => (x._id === enr._id ? { ...x, status: prev } : x)) }));
      toast.error(e.message || 'Failed to update');
    }
  }, []);

  const doUnenroll = async () => {
    const enr = unenrollTarget;
    if (!enr) return;
    setUnenrolling(enr._id);
    try {
      await StudentService.unenroll(enr._id);
      setStudent((s) => ({ ...s, enrollments: (s.enrollments || []).filter((e) => e._id !== enr._id) }));
      toast.success('Unenrolled');
      setUnenrollTarget(null);
    } catch (e) {
      toast.error(e.message || 'Failed to unenroll');
    } finally {
      setUnenrolling(null);
    }
  };

  const doToggleStatus = async () => {
    const wasActive = student.isActive;
    setStatusBusy(true);
    setStudent((s) => ({ ...s, isActive: !wasActive })); // optimistic
    try {
      const updated = await StudentService.setStatus(studentId, !wasActive);
      setStudent((s) => ({ ...s, isActive: updated?.isActive ?? !wasActive }));
      toast.success(wasActive ? 'Student deactivated' : 'Student activated');
      setConfirmToggle(false);
    } catch (e) {
      setStudent((s) => ({ ...s, isActive: wasActive })); // roll back
      toast.error(e.message || 'Failed to update');
    } finally {
      setStatusBusy(false);
    }
  };

  const doDelete = async () => {
    setRemoving(true);
    try {
      await StudentService.remove(studentId);
      toast.success('Student deleted');
      navigate('/students');
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
      setRemoving(false);
    }
  };

  const requestUnenroll = useCallback((enr) => setUnenrollTarget(enr), []);

  if (loading && !student) return <AdminLoader label="Loading student…" />;
  if (!student) {
    return <EmptyState icon={GraduationCap} title="Student not found" description={error || 'This student could not be loaded.'} action={<Button as={Link} to="/students" icon={ArrowLeft}>Back to students</Button>} />;
  }

  const active = student.isActive;
  // Robust display name so the avatar always has initials to show (e.g. "Riya Patel" → "RP").
  const displayName = student.displayName || [student.firstName, student.lastName].filter(Boolean).join(' ').trim() || student.email || 'Student';

  return (
    <div className="w-full space-y-6">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8" style={{ background: GRADIENT }}>
          <Users className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rotate-12 text-white/10" />
          <Link to="/students" className="relative inline-flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> All students
          </Link>

          <div className="relative mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar name={displayName} size="lg" className="shrink-0 ring-4 ring-white/20" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{displayName}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ring-1 ring-inset ring-white/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> {active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/80"><Mail className="h-3.5 w-3.5" /> {student.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {student.phone ? <HeroChip icon={Phone}>{student.phone}</HeroChip> : null}
                {student.country ? <HeroChip icon={Globe}>{student.country}</HeroChip> : null}
                <HeroChip icon={CalendarDays}>Joined {formatDate(student.createdAt)}</HeroChip>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button variant="white" icon={Pencil} onClick={() => setShowEdit(true)}>Edit</Button>
              <Button variant="white" icon={KeyRound} onClick={() => setShowReset(true)} className="hidden sm:inline-flex">Reset password</Button>
              <Button variant="white" icon={Power} loading={statusBusy} onClick={() => setConfirmToggle(true)}>{active ? 'Deactivate' : 'Activate'}</Button>
              <Button variant="white" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete</Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={GraduationCap} label="Enrolments" value={stats.total} />
          <HeaderStat icon={CheckCircle2} label="Completed" value={stats.completed} />
          <HeaderStat icon={BookOpen} label="In progress" value={stats.active} />
          <HeaderStat icon={ShieldCheck} label="Avg progress" value={`${stats.avg}%`} />
        </div>
      </div>

      {/* ── Body: enrolments + sticky profile ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main — enrolments */}
        <div className="space-y-4 lg:col-span-2">
          {/* Enroll toolbar */}
          <Card className="bg-muted/30">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Enroll in a course</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <CustomSelect
                  value={enrollCourseId}
                  onChange={setEnrollCourseId}
                  options={availableCourses}
                  placeholder={availableCourses.length ? 'Select a course…' : 'Enrolled in all courses'}
                  searchPlaceholder="Search courses…"
                />
              </div>
              <Button icon={Plus} onClick={doEnroll} loading={enrolling} disabled={!enrollCourseId}>Enroll</Button>
            </div>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Enrolments <span className="text-muted-foreground">({enrollments.length})</span></h3>
            </div>
            {enrollments.length === 0 ? (
              <EmptyState icon={GraduationCap} title="Not enrolled yet" description="Enroll this student into a course using the selector above." />
            ) : (
              <div className="space-y-3">
                {enrollments.map((e) => (
                  <EnrollmentRow
                    key={e._id}
                    enrollment={e}
                    busy={unenrolling === e._id}
                    onChangeStatus={changeEnrollmentStatus}
                    onUnenroll={requestUnenroll}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — profile (sticky) */}
        <aside className="lg:sticky lg:top-6 lg:col-span-1 lg:self-start">
          <Card>
            <h3 className="mb-1 text-sm font-semibold text-foreground">Profile</h3>
            <div className="divide-y divide-border">
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Phone" value={student.phone} />
              <InfoRow icon={Globe} label="Country" value={student.country} />
              <InfoRow icon={CalendarDays} label="Joined" value={formatDate(student.createdAt)} />
              <InfoRow icon={KeyRound} label="Password set" value={formatDate(student.passwordSetAt)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 sm:hidden">
              <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => setShowReset(true)} className="col-span-2">Reset password</Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* Modals */}
      <StudentFormModal open={showEdit} onClose={() => setShowEdit(false)} student={student} onSaved={reloadStudent} />
      <ResetPasswordModal open={showReset} onClose={() => setShowReset(false)} student={student} onDone={reloadStudent} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        loading={removing}
        title="Delete student?"
        message={`"${displayName}" and all their enrolments, progress and certificates will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete student"
      />
      <ConfirmDialog
        open={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        onConfirm={doToggleStatus}
        loading={statusBusy}
        tone={active ? 'danger' : 'primary'}
        title={active ? 'Deactivate student?' : 'Activate student?'}
        message={
          active
            ? `"${displayName}" will lose access to the portal until you reactivate them.`
            : `"${displayName}" will regain access to the portal and their courses.`
        }
        confirmLabel={active ? 'Deactivate' : 'Activate'}
      />
      <ConfirmDialog
        open={!!unenrollTarget}
        onClose={() => setUnenrollTarget(null)}
        onConfirm={doUnenroll}
        loading={!!unenrolling}
        title="Unenroll student?"
        message={`Remove "${displayName}" from "${unenrollTarget?.course?.title || 'this course'}"? Their progress in this course will be lost.`}
        confirmLabel="Unenroll"
      />
    </div>
  );
}

export default StudentDetailPage;
