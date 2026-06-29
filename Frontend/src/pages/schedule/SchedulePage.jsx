import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  CalendarDays,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Clock,
  MapPin,
  BookOpen,
  CalendarClock,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cn } from '../../lib/cn';
import { Card, Badge, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { CustomSelect } from '../../admin-ui/CustomSelect';
import { ScheduleService } from '../../services/schedule.service';
import { CourseService } from '../../services/course.service';
import { ScheduleEventModal } from './modals/ScheduleEventModal';
import {
  EVENT_TYPES,
  typeMeta,
  eventColor,
  hexA,
  monthGrid,
  monthLabel,
  WEEKDAYS,
  addMonths,
  isToday,
  isSameMonth,
  eventOnDay,
  startOfDay,
  formatTime,
  formatTimeRange,
  formatDayLong,
  toYmd,
} from './scheduleUtils';

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

/** A single colored event chip used inside a calendar day cell. */
function EventChip({ ev, onClick }) {
  const color = eventColor(ev);
  const cancelled = ev.status === 'cancelled';
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${ev.title} · ${formatTimeRange(ev)}`}
      className="flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: hexA(color, 0.14), color: 'var(--color-foreground)' }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {!ev.allDay ? <span className="shrink-0 tabular-nums text-muted-foreground">{formatTime(ev.start)}</span> : null}
      <span className={cn('min-w-0 flex-1 truncate', cancelled && 'line-through opacity-60')}>{ev.title}</span>
    </button>
  );
}

export function SchedulePage() {
  const { data, loading, error, refetch } = useApi(() => ScheduleService.list(), []);
  const { data: coursesData } = useApi(() => CourseService.list(), []);
  const events = useMemo(() => data || [], [data]);
  const courses = useMemo(() => coursesData || [], [coursesData]);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [view, setView] = useState('month'); // 'month' | 'agenda'
  const [filterType, setFilterType] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultDate, setDefaultDate] = useState(new Date());
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (filterType !== 'all' && e.type !== filterType) return false;
        if (filterCourse !== 'all' && String(e.courseId?._id || e.courseId || '') !== filterCourse) return false;
        return true;
      }),
    [events, filterType, filterCourse],
  );

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: events.length,
      month: events.filter((e) => isSameMonth(new Date(e.start), viewDate)).length,
      upcoming: events.filter((e) => new Date(e.end) >= now && e.status !== 'cancelled').length,
      cancelled: events.filter((e) => e.status === 'cancelled').length,
    };
  }, [events, viewDate]);

  const days = useMemo(() => monthGrid(viewDate), [viewDate]);

  // Upcoming events grouped by day for the agenda view.
  const agenda = useMemo(() => {
    const floor = startOfDay(new Date()).getTime();
    const upcoming = filtered
      .filter((e) => new Date(e.end).getTime() >= floor)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    const groups = [];
    const byKey = new Map();
    for (const ev of upcoming) {
      const key = toYmd(ev.start);
      if (!byKey.has(key)) {
        const g = { key, date: new Date(ev.start), items: [] };
        byKey.set(key, g);
        groups.push(g);
      }
      byKey.get(key).items.push(ev);
    }
    return groups;
  }, [filtered]);

  const openCreate = (date) => {
    setEditing(null);
    setDefaultDate(date || (isSameMonth(viewDate, new Date()) ? new Date() : new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)));
    setShowForm(true);
  };
  const openEdit = (ev) => { setEditing(ev); setShowForm(true); };

  const confirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await ScheduleService.remove(deleting._id);
      toast.success('Event deleted');
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setRemoving(false);
    }
  };

  const courseFilterOptions = [
    { value: 'all', label: 'All courses' },
    ...courses.map((c) => ({ value: c._id, label: c.title })),
  ];

  if (loading && !data) return <AdminLoader label="Loading schedule…" />;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Academics</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Schedule</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">Plan classes, exams, deadlines and meetings on a shared academic calendar.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="white" icon={RefreshCw} onClick={refetch} className={cn(loading && '[&_svg]:animate-spin')}>Refresh</Button>
            <Button variant="white" icon={Plus} onClick={() => openCreate()}>New event</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={CalendarDays} label="Total events" value={stats.total} />
          <HeaderStat icon={CalendarClock} label="This month" value={stats.month} />
          <HeaderStat icon={Clock} label="Upcoming" value={stats.upcoming} />
          <HeaderStat icon={Trash2} label="Cancelled" value={stats.cancelled} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setViewDate((d) => addMonths(d, -1))} className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-accent/50 hover:text-accent" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setViewDate((d) => addMonths(d, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-accent/50 hover:text-accent" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-1 min-w-[9.5rem] text-lg font-bold text-foreground">{monthLabel(viewDate)}</h2>
          <Button size="sm" variant="secondary" onClick={() => setViewDate(new Date())}>Today</Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <CustomSelect value={filterCourse} onChange={setFilterCourse} options={courseFilterOptions} placeholder="All courses" searchPlaceholder="Search courses…" />
          </div>
          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {[
              { key: 'month', label: 'Month', Icon: LayoutGrid },
              { key: 'agenda', label: 'Agenda', Icon: List },
            ].map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={cn('relative isolate inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === v.key ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}
              >
                {view === v.key && <motion.span layoutId="schedView" className="absolute inset-0 -z-10 rounded-md" style={accentTint(0.12)} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                <v.Icon className="h-4 w-4" /> {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Type legend / filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors', filterType === 'all' ? 'border-accent text-accent' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
        >
          All types
        </button>
        {EVENT_TYPES.map((t) => {
          const active = filterType === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilterType(active ? 'all' : t.value)}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors', active ? 'text-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
              style={active ? { borderColor: t.color, backgroundColor: hexA(t.color, 0.12) } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <Card className="text-sm text-danger">Couldn&apos;t load the schedule: {error.message}</Card>
      ) : view === 'month' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{w}</div>
                ))}
              </div>
              {/* Day grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={monthLabel(viewDate)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-7"
                >
                  {days.map((day) => {
                    const inMonth = isSameMonth(day, viewDate);
                    const today = isToday(day);
                    const dayEvents = filtered.filter((e) => eventOnDay(e, day)).sort((a, b) => new Date(a.start) - new Date(b.start));
                    const shown = dayEvents.slice(0, 3);
                    const extra = dayEvents.length - shown.length;
                    return (
                      <div
                        key={toYmd(day)}
                        onClick={() => openCreate(day)}
                        className={cn(
                          'group min-h-[116px] cursor-pointer border-b border-r border-border p-1.5 transition-colors hover:bg-muted/40',
                          !inMonth && 'bg-muted/20',
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between px-0.5">
                          <span
                            className={cn(
                              'grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold',
                              today ? 'text-white' : inMonth ? 'text-foreground' : 'text-muted-foreground/60',
                            )}
                            style={today ? { backgroundColor: 'var(--color-accent)' } : undefined}
                          >
                            {day.getDate()}
                          </span>
                          <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <div className="space-y-1">
                          {shown.map((ev) => (
                            <EventChip key={ev._id} ev={ev} onClick={() => openEdit(ev)} />
                          ))}
                          {extra > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setView('agenda'); }}
                              className="w-full rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground hover:text-accent"
                            >
                              +{extra} more
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Card>
      ) : agenda.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing coming up"
          description="No upcoming events match your filters. Create one to get the calendar going."
          action={<Button icon={Plus} onClick={() => openCreate()}>New event</Button>}
        />
      ) : (
        <div className="space-y-5">
          {agenda.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className={cn('text-sm font-semibold', isToday(group.date) ? 'text-accent' : 'text-foreground')}>
                  {isToday(group.date) ? 'Today' : formatDayLong(group.date)}
                </h3>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{group.items.length} event{group.items.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((ev) => (
                  <AgendaRow key={ev._id} ev={ev} onEdit={() => openEdit(ev)} onDelete={() => setDeleting(ev)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ScheduleEventModal
        open={showForm}
        onClose={() => setShowForm(false)}
        event={editing}
        defaultDate={defaultDate}
        courses={courses}
        onSaved={() => refetch()}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={removing}
        title="Delete event?"
        message={`"${deleting?.title}" will be permanently removed from the calendar. This cannot be undone.`}
        confirmLabel="Delete event"
      />
    </div>
  );
}

/** One event row in the agenda list. */
function AgendaRow({ ev, onEdit, onDelete }) {
  const meta = typeMeta(ev.type);
  const color = eventColor(ev);
  const cancelled = ev.status === 'cancelled';
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="group flex items-center gap-4 p-3" style={{ borderLeft: `3px solid ${color}` }}>
        <div className="hidden w-20 shrink-0 flex-col items-center justify-center sm:flex">
          {ev.allDay ? (
            <span className="text-xs font-semibold text-muted-foreground">All day</span>
          ) : (
            <>
              <span className="text-sm font-bold tabular-nums text-foreground">{formatTime(ev.start)}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{formatTime(ev.end)}</span>
            </>
          )}
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: hexA(color, 0.14), color }}>
          <meta.icon className="h-5 w-5" />
        </span>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={cn('truncate font-semibold text-foreground transition-colors group-hover:text-accent', cancelled && 'line-through opacity-60')}>{ev.title}</h4>
            <Badge tone={cancelled ? 'danger' : ev.status === 'completed' ? 'success' : 'muted'}>{meta.label}</Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 sm:hidden"><Clock className="h-3 w-3" /> {formatTimeRange(ev)}</span>
            {ev.courseId?.title ? <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {ev.courseId.title}</span> : null}
            {ev.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.location}</span> : null}
            {ev.instructor ? <span className="truncate">· {ev.instructor}</span> : null}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-accent" title="Edit"><Pencil className="h-4 w-4" /></button>
          <button type="button" onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      </Card>
    </motion.div>
  );
}

export default SchedulePage;
