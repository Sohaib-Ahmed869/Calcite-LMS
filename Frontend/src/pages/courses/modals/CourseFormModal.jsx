import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BookOpen } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { Field, TextInput } from '../../../admin-ui/fields';
import { CustomSelect } from '../../../admin-ui/CustomSelect';
import { Dropzone } from '../../../admin-ui/Dropzone';
import { CourseService } from '../../../services/course.service';
import { COURSE_LEVELS } from '../courseContent.utils';

const blank = { title: '', summary: '', description: '', category: '', level: 'beginner', tags: '', publish: false };

/** Create or edit a course. `course` null → create. Calls `onSaved(course)` then `onClose`. */
export function CourseFormModal({ open, onClose, course, onSaved }) {
  const editing = !!course?._id;
  const [form, setForm] = useState(blank);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (course) {
      setForm({
        title: course.title || '',
        summary: course.summary || '',
        description: course.description || '',
        category: course.category || '',
        level: course.level || 'beginner',
        tags: Array.isArray(course.tags) ? course.tags.join(', ') : '',
        publish: course.status === 'published',
      });
      setCoverPreview(course.coverImageUrl || '');
    } else {
      setForm(blank);
      setCoverPreview('');
    }
    setCoverFile(null);
  }, [open, course]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPickCover = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Cover must be an image');
    if (file.size > 5 * 1024 * 1024) return toast.error('Cover must be under 5MB');
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('summary', form.summary.trim());
      fd.append('description', form.description.trim());
      fd.append('category', form.category.trim());
      fd.append('level', form.level);
      fd.append('tags', form.tags);
      if (!editing) fd.append('status', form.publish ? 'published' : 'draft');
      if (coverFile) fd.append('coverImage', coverFile);

      const saved = editing ? await CourseService.update(course._id, fd) : await CourseService.create(fd);
      toast.success(editing ? 'Course updated' : 'Course created');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      icon={BookOpen}
      title={editing ? 'Edit course' : 'New course'}
      subtitle={editing ? course.title : 'Set up a course to hold your content'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Create course'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5 px-5 py-5">
        <Dropzone
          label="Cover image"
          hint="JPG, PNG or WebP · up to 5MB · 16:9 looks best"
          value={coverPreview}
          busy={false}
          wide
          accept="image/*"
          onUpload={onPickCover}
          onRemove={() => { setCoverFile(null); setCoverPreview(''); }}
        />

        <Field label="Title">
          <TextInput value={form.title} onChange={set('title')} placeholder="e.g. Introduction to Algebra" autoFocus />
        </Field>

        <Field label="Summary" hint="One line shown on the course card.">
          <TextInput value={form.summary} onChange={set('summary')} placeholder="A short tagline for this course" maxLength={160} />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="What will students learn?"
            className="w-full resize-none rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <TextInput value={form.category} onChange={set('category')} placeholder="e.g. Mathematics" />
          </Field>
          <Field label="Level">
            <CustomSelect value={form.level} onChange={(v) => setForm((f) => ({ ...f, level: v }))} options={COURSE_LEVELS} placeholder="Select level" />
          </Field>
        </div>

        <Field label="Tags" hint="Comma-separated.">
          <TextInput value={form.tags} onChange={set('tags')} placeholder="e.g. algebra, year 9, foundations" />
        </Field>

        {!editing ? (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-input border border-border bg-muted/40 px-3 py-2.5">
            <input type="checkbox" checked={form.publish} onChange={(e) => setForm((f) => ({ ...f, publish: e.target.checked }))} className="h-4 w-4 rounded border-border accent-[var(--color-accent)]" />
            <span className="text-sm text-foreground">Publish immediately <span className="text-muted-foreground">(otherwise saved as a draft)</span></span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}

export default CourseFormModal;
