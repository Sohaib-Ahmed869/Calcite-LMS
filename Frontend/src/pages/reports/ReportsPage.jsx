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
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { Card, Badge, Avatar, Button, EmptyState } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { ReportService } from '../../services/report.service';
import { RingStat, Donut, TrendBars, StatBar } from './charts';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

const ENROLL_COLORS = { active: 'var(--color-accent)', completed: 'var(--color-success)', suspended: 'var(--color-warning)', withdrawn: 'var(--color-mutedForeground)' };
const COURSE_COLORS = { published: 'var(--color-success)', draft: 'var(--color-warning)', archived: 'var(--color-mutedForeground)' };
const STATUS_TONE = { active: 'accent', completed: 'success', suspended: 'warning', withdrawn: 'muted' };

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
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-accent" style={accentTint(0.1)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {action}
    </div>
  );
}

export function ReportsPage() {
  const { data, loading, error, refetch } = useApi(() => ReportService.overview(), []);

  const enrollDonut = useMemo(() => {
    const e = data?.enrollStatus || {};
    return [
      { label: 'Active', value: e.active || 0, color: ENROLL_COLORS.active },
      { label: 'Completed', value: e.completed || 0, color: ENROLL_COLORS.completed },
      { label: 'Suspended', value: e.suspended || 0, color: ENROLL_COLORS.suspended },
      { label: 'Withdrawn', value: e.withdrawn || 0, color: ENROLL_COLORS.withdrawn },
    ].filter((d) => d.value > 0 || true);
  }, [data]);

  const courseDonut = useMemo(() => {
    const c = data?.courseStatus || {};
    return [
      { label: 'Published', value: c.published || 0, color: COURSE_COLORS.published },
      { label: 'Draft', value: c.draft || 0, color: COURSE_COLORS.draft },
      { label: 'Archived', value: c.archived || 0, color: COURSE_COLORS.archived },
    ];
  }, [data]);

  if (loading && !data) return <AdminLoader label="Crunching the numbers…" />;

  if (error) {
    return (
      <div className="w-full space-y-6">
        <EmptyState icon={BarChart3} title="Couldn't load reports" description={error.message} action={<Button icon={RefreshCw} onClick={refetch}>Try again</Button>} />
      </div>
    );
  }

  const t = data?.totals || {};
  const trend = data?.trend || [];
  const topCourses = data?.topCourses || [];
  const topStudents = data?.topStudents || [];
  const recent = data?.recent || [];
  const maxEnroll = Math.max(1, ...topCourses.map((c) => c.enrollments));
  const studentName = (s) => s?.name || s?.email || 'Student';

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Analytics</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Reports</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">A live overview of your courses, students, enrolments and completions across the platform.</p>
          </div>
          <Button variant="white" icon={RefreshCw} onClick={refetch} className={cn(loading && '[&_svg]:animate-spin')}>Refresh</Button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={BookOpen} label="Courses" value={t.courses || 0} hint={`${t.publishedCourses || 0} published`} />
          <HeaderStat icon={Users} label="Students" value={t.students || 0} hint={`${t.activeStudents || 0} active`} />
          <HeaderStat icon={GraduationCap} label="Enrolments" value={t.enrollments || 0} hint={`${t.activeEnrollments || 0} active`} />
          <HeaderStat icon={Award} label="Certificates" value={t.certificates || 0} hint={`${t.completedEnrollments || 0} completed`} />
        </div>
      </div>

      {/* Rings + mini stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1"><RingStat value={t.completionRate || 0} color="var(--color-success)" label="Completion rate" sublabel={`${t.completedEnrollments || 0} of ${t.enrollments || 0} enrolments`} /></Card>
        <Card className="lg:col-span-1"><RingStat value={t.avgProgress || 0} label="Avg progress" sublabel="Across all enrolments" /></Card>
        <MiniStat icon={Layers} label="Published lessons" value={t.lessons || 0} />
        <MiniStat icon={UserCheck} label="Active students" value={t.activeStudents || 0} />
      </div>

      {/* Trend + donuts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Enrolled</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-success)' }} /> Completed</span>
              </div>
            }
          >
            Enrolments over the last 12 months
          </SectionTitle>
          {trend.some((d) => d.enrolled || d.completed) ? (
            <TrendBars data={trend} />
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No enrolment activity yet.</div>
          )}
        </Card>

        <Card>
          <SectionTitle>Enrolments by status</SectionTitle>
          {t.enrollments ? <Donut data={enrollDonut} centerLabel="enrolments" /> : <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No enrolments yet.</div>}
        </Card>
      </div>

      {/* Top courses + course status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle action={<Link to="/courses" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">All courses <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
            Top courses by enrolment
          </SectionTitle>
          {topCourses.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No course data yet.</div>
          ) : (
            <div className="space-y-4">
              {topCourses.map((c) => (
                <div key={c.courseId} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Link to={`/courses/${c.courseId}`} className="min-w-0 truncate font-medium text-foreground hover:text-accent">{c.title}</Link>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{c.enrollments}</span>
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{c.completions}</span>
                      <Badge tone="accent">{c.completionRate}%</Badge>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="flex h-full">
                      <div className="h-full rounded-l-full bg-success" style={{ width: `${(c.completions / maxEnroll) * 100}%` }} title={`${c.completions} completed`} />
                      <div className="h-full bg-accent" style={{ width: `${((c.enrollments - c.completions) / maxEnroll) * 100}%` }} title={`${c.enrollments - c.completions} in progress`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Courses by status</SectionTitle>
          {t.courses ? <Donut data={courseDonut} centerLabel="courses" /> : <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No courses yet.</div>}
        </Card>
      </div>

      {/* Recent + top students */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle action={<Link to="/enrollments" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">All enrolments <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
            Recent enrolments
          </SectionTitle>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No recent enrolments.</div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li key={r._id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={studentName(r.student)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/students/${r.student?._id}`} className="block truncate text-sm font-medium text-foreground hover:text-accent">{studentName(r.student)}</Link>
                    <p className="truncate text-xs text-muted-foreground">{r.course?.title}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={STATUS_TONE[r.status] || 'muted'}>{r.status}</Badge>
                    <span className="text-[11px] text-muted-foreground">{formatDate(r.enrolledAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle action={<Link to="/students" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">All students <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
            Most active students
          </SectionTitle>
          {topStudents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No student activity yet.</div>
          ) : (
            <div className="space-y-3">
              {topStudents.map((s, i) => (
                <div key={s.studentId} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-accent" style={accentTint(0.12)}>{i + 1}</span>
                  <Avatar name={studentName(s)} size="sm" />
                  <Link to={`/students/${s.studentId}`} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-accent">{studentName(s)}</Link>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{s.enrollments}</span>
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{s.completed}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ReportsPage;
