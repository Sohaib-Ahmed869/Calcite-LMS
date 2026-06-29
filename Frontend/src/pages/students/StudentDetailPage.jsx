import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Loader2,
  BookOpen,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Card, Badge, Avatar, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { CustomSelect } from '../../admin-ui/CustomSelect';
import { AdminLoader } from '../../admin-ui/Loader';
import { StudentService } from '../../services/student.service';
import { CourseService } from '../../services/course.service';
import { StudentFormModal } from './modals/StudentFormModal';
import { ResetPasswordModal } from './modals/ResetPasswordModal';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

const ENROLLMENT_STATUS = {
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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value || '—'}</p>
      </div>
    </div>
  );
}

function EnrollmentRow({ enrollment, onChangeStatus, onUnenroll, busy }) {
  const meta = ENROLLMENT_STATUS[enrollment.status] || ENROLLMENT_STATUS.active;
  const course = enrollment.course || {};
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg text-accent" style={accentTint(0.12)}>
        {course.coverImageUrl ? <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/courses/${course._id}`} className="truncate text-sm font-semibold text-foreground hover:text-accent">{course.title}</Link>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${enrollment.progressPercent || 0}%` }} />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{enrollment.progressPercent || 0}%</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Enrolled {formatDate(enrollment.enrolledAt)}{enrollment.completedAt ? ` · completed ${formatDate(enrollment.completedAt)}` : ''}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="w-36">
          <CustomSelect value={enrollment.status} onChange={(v) => onChangeStatus(enrollment, v)} options={STATUS_OPTIONS} />
        </div>
        <Button size="iconSm" variant="dangerGhost" icon={busy ? undefined : Trash2} loading={busy} onClick={() => onUnenroll(enrollment)} title="Unenroll" />
      </div>
    </div>
  );
}

export function StudentDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      reloadStudent();
    } catch (e) {
      toast.error(e.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const changeEnrollmentStatus = async (enr, status) => {
    if (status === enr.status) return;
    try {
      await StudentService.setEnrollmentStatus(enr._id, status);
      toast.success('Enrolment updated');
      reloadStudent();
    } catch (e) {
      toast.error(e.message || 'Failed to update');
    }
  };

  const unenroll = async (enr) => {
    setUnenrolling(enr._id);
    try {
      await StudentService.unenroll(enr._id);
      toast.success('Unenrolled');
      reloadStudent();
    } catch (e) {
      toast.error(e.message || 'Failed to unenroll');
    } finally {
      setUnenrolling(null);
    }
  };

  const toggleStatus = async () => {
    setStatusBusy(true);
    try {
      await StudentService.setStatus(studentId, !student.isActive);
      toast.success(student.isActive ? 'Student deactivated' : 'Student activated');
      reloadStudent();
    } catch (e) {
      toast.error(e.message || 'Failed');
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

  if (loading) return <AdminLoader label="Loading student…" />;
  if (error || !student) {
    return <EmptyState icon={GraduationCap} title="Student not found" description={error || 'This student could not be loaded.'} action={<Button as={Link} to="/students" icon={ArrowLeft}>Back to students</Button>} />;
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="px-6 py-6 sm:px-8" style={{ background: GRADIENT }}>
          <Link to="/students" className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> All students
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={student.displayName} size="lg" className="ring-4 ring-white/20" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">{student.displayName}</h1>
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">{student.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/80"><Mail className="h-3.5 w-3.5" /> {student.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="white" icon={Pencil} onClick={() => setShowEdit(true)}>Edit</Button>
              <Button variant="white" icon={KeyRound} onClick={() => setShowReset(true)}>Reset password</Button>
              <Button variant="white" icon={Power} loading={statusBusy} onClick={toggleStatus}>{student.isActive ? 'Deactivate' : 'Activate'}</Button>
              <Button variant="white" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete</Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={GraduationCap} label="Enrolments" value={stats.total} />
          <HeaderStat icon={CheckCircle2} label="Completed" value={stats.completed} />
          <HeaderStat icon={BookOpen} label="In progress" value={stats.active} />
          <HeaderStat icon={ShieldCheck} label="Avg progress" value={`${stats.avg}%`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-1">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Profile</h3>
          <div className="divide-y divide-border">
            <InfoRow icon={Mail} label="Email" value={student.email} />
            <InfoRow icon={Phone} label="Phone" value={student.phone} />
            <InfoRow icon={Globe} label="Country" value={student.country} />
            <InfoRow icon={CalendarDays} label="Joined" value={formatDate(student.createdAt)} />
            <InfoRow icon={KeyRound} label="Password set" value={formatDate(student.passwordSetAt)} />
          </div>
        </Card>

        {/* Enrolments */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
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
            <h3 className="mb-3 text-sm font-semibold text-foreground">Enrolments <span className="text-muted-foreground">({enrollments.length})</span></h3>
            {enrollments.length === 0 ? (
              <EmptyState icon={GraduationCap} title="Not enrolled yet" description="Enroll this student into a course using the selector above." />
            ) : (
              <div className="space-y-3">
                {enrollments.map((e) => (
                  <EnrollmentRow key={e._id} enrollment={e} busy={unenrolling === e._id} onChangeStatus={changeEnrollmentStatus} onUnenroll={unenroll} />
                ))}
              </div>
            )}
          </div>
        </div>
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
        message={`"${student.displayName}" and all their enrolments, progress and certificates will be permanently deleted.`}
        confirmLabel="Delete student"
      />
    </div>
  );
}

export default StudentDetailPage;
