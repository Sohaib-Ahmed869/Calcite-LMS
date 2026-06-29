import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, FileCheck2, X } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { Field, TextInput } from '../../../admin-ui/fields';
import { LessonService } from '../../../services/course.service';
import { LESSON_TYPES, ACCEPT, formatBytes } from '../courseContent.utils';
import { cn } from '../../../lib/cn';

// Map a stored lesson's contentType to one of the form's type tabs.
function typeKeyFromLesson(lesson) {
  const t = (lesson?.contentType || 'document').toLowerCase();
  if (['video', 'image', 'audio', 'link', 'text'].includes(t)) return t;
  return 'document'; // pdf / presentation / document all edit as "document"
}

const blank = { title: '', description: '', externalUrl: '', textContent: '', duration: '', isPreview: false, isPublished: true };

/** Create or edit a lesson ("resource"). `lesson` null → create (needs `moduleId`). */
export function LessonFormModal({ open, onClose, moduleId, lesson, onSaved }) {
  const editing = !!lesson?._id;
  const [type, setType] = useState('document');
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const hasExistingFile = !!(lesson?.fileUrl || lesson?.fileKey);
  const isFileType = ['document', 'video', 'image', 'audio'].includes(type);
  const isLink = type === 'link';
  const isText = type === 'text';
  const showUrl = isLink || type === 'video';

  useEffect(() => {
    if (!open) return;
    if (lesson) {
      setType(typeKeyFromLesson(lesson));
      setForm({
        title: lesson.title || '',
        description: lesson.description || '',
        externalUrl: lesson.externalUrl || '',
        textContent: lesson.textContent || '',
        duration: lesson.duration ? String(Math.round(lesson.duration / 60)) : '',
        isPreview: !!lesson.isPreview,
        isPublished: lesson.isPublished !== false,
      });
    } else {
      setType('document');
      setForm(blank);
    }
    setFile(null);
  }, [open, lesson]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickFile = (f) => {
    if (!f) return;
    const max = type === 'video' ? 500 : 50;
    if (f.size > max * 1024 * 1024) return toast.error(`File must be under ${max}MB`);
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (isLink && !form.externalUrl.trim()) return toast.error('A URL is required for a link');
    if (isText && !form.textContent.trim()) return toast.error('Text content is required');
    if (isFileType && !file && !hasExistingFile && !(type === 'video' && form.externalUrl.trim())) {
      return toast.error(type === 'video' ? 'Upload a video or paste a video link' : 'Please choose a file to upload');
    }

    const durationSec = form.duration ? Math.round(parseFloat(form.duration) * 60) : undefined;
    setSaving(true);
    try {
      let payload;
      if (file) {
        // Multipart — uploaded file (field "file").
        const fd = new FormData();
        fd.append('file', file);
        if (!editing) fd.append('moduleId', moduleId);
        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('contentType', type);
        if (durationSec !== undefined) fd.append('duration', String(durationSec));
        fd.append('isPreview', String(form.isPreview));
        fd.append('isPublished', String(form.isPublished));
        payload = fd;
      } else {
        // JSON — link, text, or metadata-only edit of an existing file.
        payload = {
          ...(editing ? {} : { moduleId }),
          title: form.title.trim(),
          description: form.description.trim(),
          contentType: type,
          duration: durationSec,
          isPreview: form.isPreview,
          isPublished: form.isPublished,
        };
        if (showUrl) payload.externalUrl = form.externalUrl.trim() || undefined;
        if (isText) payload.textContent = form.textContent;
      }

      const saved = editing ? await LessonService.update(lesson._id, payload) : await LessonService.create(payload);
      toast.success(editing ? 'Resource updated' : 'Resource added');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      icon={Upload}
      title={editing ? 'Edit resource' : 'Add resource'}
      subtitle="Upload a file, embed a video, link out, or write text"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Add resource'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5 px-5 py-5">
        {/* Type selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Type</p>
          <div className="flex flex-wrap gap-2">
            {LESSON_TYPES.map(({ key, label, icon: Icon }) => {
              const active = type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setType(key); setFile(null); }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-btn border px-3 py-2 text-xs font-semibold transition-all',
                    active ? 'border-accent bg-accent text-accent-foreground shadow-sm' : 'border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* File drop (file types) */}
        {isFileType ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              File {type === 'video' ? <span className="font-normal text-muted-foreground">(optional if you paste a link below)</span> : null}
            </p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={ACCEPT[type] || undefined}
              onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-4 py-8 text-center transition-colors',
                dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-muted/40',
              )}
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <FileCheck2 className="h-5 w-5 text-accent" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({formatBytes(file.size)})</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="ml-1 rounded p-0.5 text-muted-foreground hover:text-danger"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-foreground">Drop a file here or <span className="font-semibold text-accent">browse</span></p>
                  {editing && hasExistingFile ? <p className="mt-1 text-xs text-muted-foreground">Current: {lesson.fileName || 'uploaded file'} — choose a new file to replace it</p> : null}
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* External URL (video/link) */}
        {showUrl ? (
          <Field label={isLink ? 'URL' : 'Video link'} hint={type === 'video' ? 'YouTube, Vimeo or a direct video URL — optional if you uploaded a file.' : 'Where this link points to.'}>
            <TextInput type="url" value={form.externalUrl} onChange={set('externalUrl')} placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
        ) : null}

        {/* Text content */}
        {isText ? (
          <Field label="Content">
            <textarea
              value={form.textContent}
              onChange={set('textContent')}
              rows={6}
              placeholder="Write the lesson text here…"
              className="w-full resize-y rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </Field>
        ) : null}

        <Field label="Title">
          <TextInput value={form.title} onChange={set('title')} placeholder="Resource title" />
        </Field>
        <Field label="Description" hint="Optional.">
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={2}
            placeholder="Brief description"
            className="w-full resize-none rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </Field>

        {type === 'video' || type === 'audio' ? (
          <Field label="Duration" hint="In minutes — optional.">
            <TextInput type="number" min="0" step="0.5" value={form.duration} onChange={set('duration')} placeholder="e.g. 12" className="max-w-[160px]" />
          </Field>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-input border border-border bg-muted/40 px-3 py-2.5">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="h-4 w-4 rounded border-border accent-[var(--color-accent)]" />
            <span className="text-sm text-foreground">Published</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-input border border-border bg-muted/40 px-3 py-2.5">
            <input type="checkbox" checked={form.isPreview} onChange={(e) => setForm((f) => ({ ...f, isPreview: e.target.checked }))} className="h-4 w-4 rounded border-border accent-[var(--color-accent)]" />
            <span className="text-sm text-foreground">Free preview</span>
          </label>
        </div>
      </form>
    </Modal>
  );
}

export default LessonFormModal;
