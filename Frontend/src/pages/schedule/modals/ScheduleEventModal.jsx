import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CalendarPlus, MapPin, Link as LinkIcon, User } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { Field, TextInput } from '../../../admin-ui/fields';
import { CustomSelect } from '../../../admin-ui/CustomSelect';
import { ScheduleService } from '../../../services/schedule.service';
import { EVENT_TYPES, EVENT_STATUSES, typeMeta, toYmd, toHm, fromDateTime, startOfDay, endOfDay } from '../scheduleUtils';

const blank = (date) => ({
  title: '',
  type: 'class',
  courseId: '',
  status: 'scheduled',
  date: toYmd(date || new Date()),
  startTime: '09:00',
  endTime: '10:00',
  allDay: false,
  location: '',
  meetingUrl: '',
  instructor: '',
  description: '',
});

const typeOptions = EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }));

/**
 * Create or edit a calendar event. `event` null → create (prefilled to `defaultDate`).
 * `courses` is the list used for the optional course link. Calls `onSaved()` then `onClose`.
 */
export function ScheduleEventModal({ open, onClose, event, defaultDate, courses = [], onSaved }) {
  const editing = !!event?._id;
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        title: event.title || '',
        type: event.type || 'class',
        courseId: event.courseId?._id || event.courseId || '',
        status: event.status || 'scheduled',
        date: toYmd(event.start),
        startTime: toHm(event.start),
        endTime: toHm(event.end),
        allDay: !!event.allDay,
        location: event.location || '',
        meetingUrl: event.meetingUrl || '',
        instructor: event.instructor || '',
        description: event.description || '',
      });
    } else {
      setForm(blank(defaultDate));
    }
  }, [open, event, defaultDate]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const courseOptions = [{ value: '', label: 'No course' }, ...courses.map((c) => ({ value: c._id, label: c.title }))];

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.allDay && form.endTime <= form.startTime) return toast.error('End time must be after the start time');

    const start = form.allDay ? startOfDay(fromDateTime(form.date, '00:00')) : fromDateTime(form.date, form.startTime);
    const end = form.allDay ? endOfDay(fromDateTime(form.date, '00:00')) : fromDateTime(form.date, form.endTime);

    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        type: form.type,
        courseId: form.courseId,
        status: form.status,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: form.allDay,
        location: form.location.trim(),
        meetingUrl: form.meetingUrl.trim(),
        instructor: form.instructor.trim(),
        description: form.description.trim(),
      };
      const saved = editing ? await ScheduleService.update(event._id, body) : await ScheduleService.create(body);
      toast.success(editing ? 'Event updated' : 'Event created');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const meta = typeMeta(form.type);

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      icon={CalendarPlus}
      title={editing ? 'Edit event' : 'New event'}
      subtitle={editing ? event.title : 'Add a session, exam, deadline or meeting'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Create event'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5 px-5 py-5">
        <Field label="Title">
          <TextInput value={form.title} onChange={set('title')} placeholder="e.g. Algebra — Lecture 3" autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <CustomSelect value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={typeOptions} placeholder="Select type" />
              </div>
            </div>
          </Field>
          <Field label="Course" hint="Optional — link this event to a course.">
            <CustomSelect value={form.courseId} onChange={(v) => setForm((f) => ({ ...f, courseId: v }))} options={courseOptions} placeholder="No course" searchPlaceholder="Search courses…" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date">
            <TextInput type="date" value={form.date} onChange={set('date')} />
          </Field>
          <Field label="Start">
            <TextInput type="time" value={form.startTime} onChange={set('startTime')} disabled={form.allDay} />
          </Field>
          <Field label="End">
            <TextInput type="time" value={form.endTime} onChange={set('endTime')} disabled={form.allDay} />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-input border border-border bg-muted/40 px-3 py-2.5">
          <input type="checkbox" checked={form.allDay} onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))} className="h-4 w-4 rounded border-border accent-[var(--color-accent)]" />
          <span className="text-sm text-foreground">All-day event</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <TextInput icon={MapPin} value={form.location} onChange={set('location')} placeholder="e.g. Room 204 / Online" />
          </Field>
          <Field label="Instructor">
            <TextInput icon={User} value={form.instructor} onChange={set('instructor')} placeholder="e.g. Dr. Khan" />
          </Field>
        </div>

        <Field label="Meeting link" hint="For online sessions.">
          <TextInput icon={LinkIcon} value={form.meetingUrl} onChange={set('meetingUrl')} placeholder="https://…" />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Agenda, notes or details…"
            className="w-full resize-none rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </Field>

        {editing ? (
          <Field label="Status">
            <CustomSelect value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={EVENT_STATUSES} placeholder="Status" />
          </Field>
        ) : null}
      </form>
    </Modal>
  );
}

export default ScheduleEventModal;
