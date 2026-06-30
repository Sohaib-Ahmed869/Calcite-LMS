import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Plus,
  UserPlus,
  Palette,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../lib/useApi';
import { apiGet } from '../lib/api';
import { cn } from '../lib/cn';
import { formatDate } from '../lib/format';
import { Card, Badge, Avatar, Button } from '../components/ui';
import { AdminLoader } from '../admin-ui/Loader';
import { RingStat, Donut, TrendBars } from './reports/charts';
import { useReportOverview } from '../services/useReportOverview';
import { CourseFormModal } from './courses/modals/CourseFormModal';
import { StudentFormModal } from './students/modals/StudentFormModal';
import { EnrollModal } from './enrollments/modals/EnrollModal';

const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });
const HERO = [
  'linear-gradient(to right, rgba(var(--color-accent-rgb), 0.28), transparent 60%)',
  'linear-gradient(135deg, var(--color-sidebar) 0%, color-mix(in srgb, var(--color-sidebar) 82%, #000) 100%)',
].join(', ');

const ENROLL_COLORS = { active: 'var(--color-accent)', completed: 'var(--color-success)', suspended: 'var(--color-warning)', withdrawn: 'var(--color-mutedForeground)' };
const STATUS_TONE = { active: 'accent', completed: 'success', suspended: 'warning', withdrawn: 'muted' };
const EVENT_COLORS = { class: 'var(--color-accent)', exam: 'var(--color-danger)', assignment: 'var(--color-warning)', workshop: '#0ea5e9', meeting: '#8b5cf6', holiday: 'var(--color-success)', other: 'var(--color-mutedForeground)' };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function eventWhen(ev) {
  if (ev.allDay) return formatDate(ev.start);
  const d = new Date(ev.start);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `Today · ${time}` : `${formatDate(ev.start)} · ${time}`;
}

function StatCard({ to, icon: Icon, label, value, hint }) {
  return (
    <Link to={to}>
      <Card className="group flex items-start justify-between transition-all hover:-translate-y-0.5 hover:shadow-lift">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card text-accent transition-transform group-hover:scale-105" style={accentTint(0.12)}>
          <Icon className="h-5 w-5" />
        </span>
      </Card>
    </Link>
  );
}

/** A quick action that either opens a modal (`onClick`) or navigates (`to`). */
function QuickAction({ to, onClick, icon: Icon, label, desc }) {
  const cls = 'group flex w-full items-center gap-3 rounded-card border border-border bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-soft';
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground" style={accentTint(0.12)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{desc}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} className={cls}>{inner}</button>
    : <Link to={to} className={cn(cls, 'no-underline')}>{inner}</Link>;
}

function SectionTitle({ children, to, linkLabel }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
      {to ? <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">{linkLabel} <ArrowUpRight className="h-3.5 w-3.5" /></Link> : null}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin') || user?.role === 'admin';
  const firstName = user?.displayName?.split(' ')[0] || user?.firstName || 'there';

  // Quick-create modals open straight from the dashboard; on save we refresh the KPIs/charts.
  const [modal, setModal] = useState(null); // 'course' | 'student' | 'enroll' | null

  // Shared session cache with the Reports page → navigating between them won't refetch.
  const overview = useReportOverview(isAdmin);
  const schedule = useApi(() => apiGet(`/schedule?from=${encodeURIComponent(new Date().toISOString())}`).catch(() => []), []);

  // A quick-create succeeded → refresh the analytics so the KPIs/charts reflect it.
  const afterSave = () => overview.refetch();

  const t = overview.data?.totals || {};
  const trend = overview.data?.trend || [];
  const recent = overview.data?.recent || [];
  const upcoming = useMemo(() => (schedule.data || []).slice(0, 5), [schedule.data]);

  const enrollDonut = useMemo(() => {
    const e = overview.data?.enrollStatus || {};
    return [
      { label: 'Active', value: e.active || 0, color: ENROLL_COLORS.active },
      { label: 'Completed', value: e.completed || 0, color: ENROLL_COLORS.completed },
      { label: 'Suspended', value: e.suspended || 0, color: ENROLL_COLORS.suspended },
      { label: 'Withdrawn', value: e.withdrawn || 0, color: ENROLL_COLORS.withdrawn },
    ];
  }, [overview.data]);

  const studentName = (s) => s?.name || s?.email || 'Student';

  // First paint → show the branded loader with the Dashboard icon (matches the active tab),
  // consistent with the other pages. Admins wait on the overview; students on the schedule.
  const firstLoad = isAdmin ? overview.loading && !overview.data : schedule.loading && !schedule.data;
  if (firstLoad) return <AdminLoader label="Loading dashboard…" />;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-card p-6 text-white md:p-8" style={{ background: HERO }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-white/60">{greeting()}</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Welcome back, {firstName} 👋</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              {isAdmin ? "Here's a live snapshot of your courses, students and enrolments." : 'Pick up where you left off and keep learning.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <>
                <Button icon={Plus} onClick={() => setModal('course')}>New course</Button>
                <Button variant="white" icon={UserPlus} onClick={() => setModal('student')}>Add student</Button>
                <Button as={Link} to="/reports" variant="white" icon={TrendingUp}>View reports</Button>
              </>
            ) : (
              <Button as={Link} to="/learn" icon={ArrowRight}>Go to my learning</Button>
            )}
          </div>
        </div>
      </div>

      {isAdmin ? (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard to="/courses" icon={BookOpen} label="Courses" value={t.courses ?? 0} hint={`${t.publishedCourses ?? 0} published`} />
            <StatCard to="/students" icon={Users} label="Students" value={t.students ?? 0} hint={`${t.activeStudents ?? 0} active`} />
            <StatCard to="/enrollments" icon={GraduationCap} label="Enrolments" value={t.enrollments ?? 0} hint={`${t.activeEnrollments ?? 0} active`} />
            <StatCard to="/reports" icon={TrendingUp} label="Completion rate" value={`${t.completionRate ?? 0}%`} hint={`avg progress ${t.avgProgress ?? 0}%`} />
          </div>

          {/* Quick actions — open the create modals right here, no page hop */}
          <Card>
            <SectionTitle>Quick actions</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction onClick={() => setModal('course')} icon={Plus} label="Create a course" desc="Build modules & upload content" />
              <QuickAction onClick={() => setModal('student')} icon={UserPlus} label="Add a student" desc="Create a learner account" />
              <QuickAction onClick={() => setModal('enroll')} icon={GraduationCap} label="Enrol students" desc="Assign learners to courses" />
              <QuickAction to="/admin/branding" icon={Palette} label="Customise branding" desc="Theme, logos & colours" />
            </div>
          </Card>

          {/* Trend + status */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <SectionTitle to="/reports" linkLabel="Reports">Enrolments over the last 12 months</SectionTitle>
              {trend.some((d) => d.enrolled || d.completed) ? (
                <TrendBars data={trend} />
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No enrolment activity yet.</div>
              )}
            </Card>
            <Card>
              <SectionTitle>Enrolments by status</SectionTitle>
              {t.enrollments ? <Donut data={enrollDonut} centerLabel="enrolments" /> : (
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                  <RingStat value={t.completionRate || 0} color="var(--color-success)" label="Completion rate" sublabel="No enrolments yet" />
                </div>
              )}
            </Card>
          </div>

          {/* Recent + schedule */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <SectionTitle to="/enrollments" linkLabel="All enrolments">Recent enrolments</SectionTitle>
              {recent.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No enrolments yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((r) => (
                    <li key={r._id} className="flex items-center gap-3 py-2.5">
                      <Avatar name={studentName(r.student)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/students/${r.student?._id}`} className="block truncate text-sm font-medium text-foreground hover:text-accent">{studentName(r.student)}</Link>
                        <p className="truncate text-xs text-muted-foreground">enrolled in {r.course?.title}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={STATUS_TONE[r.status] || 'muted'} className="capitalize">{r.status}</Badge>
                        <span className="text-[11px] text-muted-foreground">{formatDate(r.enrolledAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionTitle to="/schedule" linkLabel="Calendar">Upcoming schedule</SectionTitle>
              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <CalendarDays className="h-7 w-7 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
                  <Link to="/schedule" className="text-xs font-medium text-accent hover:underline">Add an event</Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((ev) => (
                    <li key={ev._id} className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ev.color || EVENT_COLORS[ev.type] || EVENT_COLORS.other }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{ev.title}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{eventWhen(ev)}</span>
                          {ev.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span> : null}
                          {ev.courseId?.title ? <span className="truncate">· {ev.courseId.title}</span> : null}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">{ev.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

        </>
      ) : (
        /* Non-admin: keep it simple and welcoming */
        <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full text-accent" style={accentTint(0.12)}><Sparkles className="h-7 w-7" /></span>
          <p className="text-base font-semibold text-foreground">Ready to learn?</p>
          <p className="max-w-sm text-sm text-muted-foreground">Head to your learning home to continue your enrolled courses.</p>
          <Button as={Link} to="/learn" icon={ArrowRight} className="mt-1">Go to my learning</Button>
        </Card>
      )}

      {/* Quick-create modals — opened from the hero & quick actions */}
      <CourseFormModal open={modal === 'course'} onClose={() => setModal(null)} course={null} onSaved={afterSave} />
      <StudentFormModal open={modal === 'student'} onClose={() => setModal(null)} student={null} onSaved={afterSave} />
      <EnrollModal open={modal === 'enroll'} onClose={() => setModal(null)} onSaved={afterSave} />
    </div>
  );
}

export default DashboardPage;
