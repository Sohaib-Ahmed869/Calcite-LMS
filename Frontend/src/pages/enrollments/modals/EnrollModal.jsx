import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { GraduationCap, Search, Check, Loader2, Users } from 'lucide-react';
import { Modal, Button, Avatar } from '../../../components/ui';
import { CustomSelect } from '../../../admin-ui/CustomSelect';
import { cn } from '../../../lib/cn';
import { cachedFetch, peekCache, invalidateCache } from '../../../lib/useApi';
import { CourseService } from '../../../services/course.service';
import { StudentService } from '../../../services/student.service';
import { EnrollmentService } from '../../../services/enrollment.service';

/** Enrol one or more students into a course. */
export function EnrollModal({ open, onClose, onSaved, defaultCourseId }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState('');
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setSelected(new Set());
    setQuery('');
    setCourseId(defaultCourseId || '');

    // Served from the shared session cache (the 'courses' key is shared with the Courses page).
    // When both lists are still fresh, reopening the modal needs no network call at all.
    const cachedCourses = peekCache('courses');
    const cachedStudents = peekCache('students:active');
    if (cachedCourses && cachedStudents) {
      setCourses(cachedCourses);
      setStudents(cachedStudents);
      setLoading(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);
    Promise.all([
      cachedFetch('courses', () => CourseService.list()).catch(() => []),
      cachedFetch('students:active', () => StudentService.list({ status: 'active' })).catch(() => []),
    ])
      .then(([cs, ss]) => { if (alive) { setCourses(cs || []); setStudents(ss || []); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, defaultCourseId]);

  // When the course changes, mark students already enrolled so we can disable them.
  useEffect(() => {
    if (!open || !courseId) { setEnrolledIds(new Set()); return; }
    let alive = true;
    EnrollmentService.list({ courseId })
      .then((rows) => alive && setEnrolledIds(new Set((rows || []).map((r) => String(r.student?._id)))))
      .catch(() => alive && setEnrolledIds(new Set()));
    return () => { alive = false; };
  }, [open, courseId]);

  const courseOptions = useMemo(() => courses.map((c) => ({ value: c._id, label: c.title })), [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => [s.displayName, s.email].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [students, query]);

  const toggle = (id) => {
    if (enrolledIds.has(String(id))) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!courseId) return toast.error('Choose a course');
    if (!selected.size) return toast.error('Select at least one student');
    setSaving(true);
    try {
      const res = await EnrollmentService.enroll(courseId, [...selected]);
      const n = res?.enrolled ?? selected.size;
      invalidateCache('enrollments'); // the list cache is now stale → next visit/refetch pulls fresh
      toast.success(`${n} student${n === 1 ? '' : 's'} enrolled`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to enroll');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      icon={GraduationCap}
      title="Enroll students"
      subtitle="Add students to a course"
      size="lg"
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">{selected.size} selected</span>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} icon={GraduationCap} disabled={!courseId || !selected.size}>Enroll {selected.size || ''}</Button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-5">
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Course</p>
          <CustomSelect value={courseId} onChange={setCourseId} options={courseOptions} placeholder="Select a course…" searchPlaceholder="Search courses…" />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Students</p>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students…"
              className="w-full rounded-input border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-card border border-border">
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Users className="h-6 w-6" />
                <p className="text-xs">{students.length === 0 ? 'No active students. Create some first.' : 'No matching students.'}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((s) => {
                  const already = enrolledIds.has(String(s._id));
                  const checked = selected.has(s._id);
                  return (
                    <li key={s._id}>
                      <button
                        type="button"
                        onClick={() => toggle(s._id)}
                        disabled={already}
                        className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors', already ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/50')}
                      >
                        <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors', checked ? 'border-accent bg-accent text-accent-foreground' : 'border-border')}>
                          {checked ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        <Avatar name={s.displayName} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{s.displayName}</span>
                          <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
                        </span>
                        {already ? <span className="shrink-0 rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Enrolled</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EnrollModal;
