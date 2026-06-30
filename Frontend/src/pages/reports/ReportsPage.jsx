import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  RefreshCw,
  BookOpen,
  Users,
  GraduationCap,
  Award,
  CheckCircle2,
  Layers,
  UserCheck,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Trophy,
  Clock,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Card, Badge, Avatar, Button, EmptyState } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { useReportOverview } from '../../services/useReportOverview';
import { RingStat, Donut, TrendBars } from './charts';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });
const fmt = (n) => (Number(n) || 0).toLocaleString();

const ENROLL_COLORS = { active: 'var(--color-accent)', completed: 'var(--color-success)', suspended: 'var(--color-warning)', withdrawn: 'var(--color-mutedForeground)' };
const COURSE_COLORS = { published: 'var(--color-success)', draft: 'var(--color-warning)', archived: 'var(--color-mutedForeground)' };
const STATUS_TONE = { active: 'accent', completed: 'success', suspended: 'warning', withdrawn: 'muted' };

const studentName = (s) => s?.name || s?.email || 'Student';

/* ── Small building blocks ──────────────────────────────────────────────────── */
function HeaderStat({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-accent" style={accentTint(0.1)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold text-foreground">{value}</p>
        {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-accent" style={accentTint(0.1)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-accent" /> : null}
        <span className="truncate">{children}</span>
      </h3>
      {action}
    </div>
  );
}

function MoreLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline">
      {children} <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function ChartEmpty({ children }) {
  return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{children}</div>;
}

export function ReportsPage() {
  // Served from a shared session cache (see useReportOverview) — revisits within the TTL render
  // instantly with no API call; Refresh forces a fresh pull.
  const { data, loading, error, refetch } = useReportOverview();

  // One pass over the payload → every derived view-model the page renders. Recomputed only when the
  // fetched data changes, so re-renders from hover/animation don't re-crunch the numbers.
  const m = useMemo(() => {
    const t = data?.totals || {};
    const trend = data?.trend || [];
    const topCourses = data?.topCourses || [];
    const e = data?.enrollStatus || {};
    const c = data?.courseStatus || {};
    return {
      t,
      trend,
      topCourses,
      topStudents: data?.topStudents || [],
      recent: data?.recent || [],
      maxEnroll: Math.max(1, ...topCourses.map((x) => x.enrollments || 0)),
      hasTrend: trend.some((d) => d.enrolled || d.completed),
      // Drop empty buckets so the legends stay tidy.
      enrollDonut: [
        { label: 'Active', value: e.active || 0, color: ENROLL_COLORS.active },
        { label: 'Completed', value: e.completed || 0, color: ENROLL_COLORS.completed },
        { label: 'Suspended', value: e.suspended || 0, color: ENROLL_COLORS.suspended },
        { label: 'Withdrawn', value: e.withdrawn || 0, color: ENROLL_COLORS.withdrawn },
      ].filter((d) => d.value > 0),
      courseDonut: [
        { label: 'Published', value: c.published || 0, color: COURSE_COLORS.published },
        { label: 'Draft', value: c.draft || 0, color: COURSE_COLORS.draft },
        { label: 'Archived', value: c.archived || 0, color: COURSE_COLORS.archived },
      ].filter((d) => d.value > 0),
    };
  }, [data]);

  if (loading && !data) return <AdminLoader label="Crunching the numbers…" />;

  if (error) {
    return (
      <div className="w-full">
        <EmptyState icon={BarChart3} title="Couldn't load reports" description={error.message} action={<Button icon={RefreshCw} onClick={refetch}>Try again</Button>} />
      </div>
    );
  }

  const { t, trend, topCourses, topStudents, recent, maxEnroll, hasTrend, enrollDonut, courseDonut } = m;

  return (
    <div className="w-full space-y-5">
      {/* Header card — gradient band + integrated stats (matches the rest of the portal) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          {/* decorative cover motif */}
          <BarChart3 className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rotate-12 text-white/10" />
          <TrendingUp className="pointer-events-none absolute -bottom-12 right-24 h-32 w-32 -rotate-12 text-white/[0.07]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Analytics</p>
              <h1 className="mt-0.5 text-2xl font-bold text-white">Reports</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">A live overview of your courses, students, enrolments and completions.</p>
            </div>
            <Button variant="white" icon={RefreshCw} onClick={refetch} className={cn('shrink-0 active:scale-95', loading && '[&_svg]:animate-spin')}>Refresh</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={BookOpen} label="Courses" value={fmt(t.courses)} hint={`${fmt(t.publishedCourses)} published`} />
          <HeaderStat icon={Users} label="Students" value={fmt(t.students)} hint={`${fmt(t.activeStudents)} active`} />
          <HeaderStat icon={GraduationCap} label="Enrolments" value={fmt(t.enrollments)} hint={`${fmt(t.activeEnrollments)} active`} />
          <HeaderStat icon={Award} label="Certificates" value={fmt(t.certificates)} hint={`${fmt(t.completedEnrollments)} completed`} />
        </div>
      </div>

      {/* Rings + mini stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><RingStat size={76} stroke={8} value={t.completionRate || 0} color="var(--color-success)" label="Completion rate" sublabel={`${fmt(t.completedEnrollments)} of ${fmt(t.enrollments)}`} /></Card>
        <Card className="p-4"><RingStat size={76} stroke={8} value={t.avgProgress || 0} label="Avg progress" sublabel="All enrolments" /></Card>
        <MiniStat icon={Layers} label="Published lessons" value={fmt(t.lessons)} />
        <MiniStat icon={UserCheck} label="Active students" value={fmt(t.activeStudents)} />
      </div>

      {/* Trend + enrolment donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle
            icon={TrendingUp}
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Enrolled</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-success)' }} /> Completed</span>
              </div>
            }
          >
            Enrolments · last 12 months
          </SectionTitle>
          {hasTrend ? <TrendBars data={trend} height={150} /> : <ChartEmpty>No enrolment activity yet.</ChartEmpty>}
        </Card>

        <Card className="p-4">
          <SectionTitle icon={Activity}>Enrolments by status</SectionTitle>
          {t.enrollments ? <Donut data={enrollDonut} size={150} thickness={22} centerLabel="Enrolments" /> : <ChartEmpty>No enrolments yet.</ChartEmpty>}
        </Card>
      </div>

      {/* Top courses + course status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle icon={Trophy} action={<MoreLink to="/courses">All courses</MoreLink>}>Top courses by enrolment</SectionTitle>
          {topCourses.length === 0 ? (
            <ChartEmpty>No course data yet.</ChartEmpty>
          ) : (
            <div className="-mx-2 space-y-1">
              {topCourses.map((c) => (
                <Link key={c.courseId} to={`/courses/${c.courseId}`} className="group block space-y-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-foreground transition-colors group-hover:text-accent">{c.title}</span>
                    <span className="flex shrink-0 items-center gap-2.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{c.enrollments}</span>
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{c.completions}</span>
                      <Badge tone="accent">{c.completionRate}%</Badge>
                    </span>
                  </div>
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-l-full bg-success" style={{ width: `${(c.completions / maxEnroll) * 100}%` }} title={`${c.completions} completed`} />
                    <div className="h-full bg-accent" style={{ width: `${((c.enrollments - c.completions) / maxEnroll) * 100}%` }} title={`${c.enrollments - c.completions} in progress`} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <SectionTitle icon={BookOpen}>Courses by status</SectionTitle>
          {t.courses ? <Donut data={courseDonut} size={150} thickness={22} centerLabel="Courses" /> : <ChartEmpty>No courses yet.</ChartEmpty>}
        </Card>
      </div>

      {/* Recent + top students */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle icon={Clock} action={<MoreLink to="/enrollments">All enrolments</MoreLink>}>Recent enrolments</SectionTitle>
          {recent.length === 0 ? (
            <ChartEmpty>No recent enrolments.</ChartEmpty>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {recent.map((r) => (
                <li key={r._id}>
                  <Link to={`/students/${r.student?._id}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
                    <Avatar name={studentName(r.student)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">{studentName(r.student)}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.course?.title}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={STATUS_TONE[r.status] || 'muted'} className="capitalize">{r.status}</Badge>
                      <span className="text-[11px] text-muted-foreground">{formatDate(r.enrolledAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <SectionTitle icon={Trophy} action={<MoreLink to="/students">All students</MoreLink>}>Most active students</SectionTitle>
          {topStudents.length === 0 ? (
            <ChartEmpty>No student activity yet.</ChartEmpty>
          ) : (
            <div className="-mx-2 space-y-0.5">
              {topStudents.map((s, i) => (
                <Link key={s.studentId} to={`/students/${s.studentId}`} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-accent" style={accentTint(0.12)}>{i + 1}</span>
                  <Avatar name={studentName(s)} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">{studentName(s)}</span>
                  <span className="flex shrink-0 items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{s.enrollments}</span>
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{s.completed}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ReportsPage;
