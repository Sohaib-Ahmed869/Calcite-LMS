import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Layers } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { Field, TextInput } from '../../../admin-ui/fields';
import { ModuleService } from '../../../services/course.service';

/** Create or edit a module (section). `module` null → create (needs `courseId`). */
export function ModuleFormModal({ open, onClose, courseId, module, onSaved }) {
  const editing = !!module?._id;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(module?.title || '');
    setDescription(module?.description || '');
    setIsPublished(module ? module.isPublished !== false : true);
  }, [open, module]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const body = { title: title.trim(), description: description.trim(), isPublished };
      const saved = editing ? await ModuleService.update(module._id, body) : await ModuleService.create(courseId, body);
      toast.success(editing ? 'Module updated' : 'Module created');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      icon={Layers}
      title={editing ? 'Edit module' : 'New module'}
      subtitle="A module groups related resources, like a chapter"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Create module'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5 px-5 py-5">
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 1: Getting Started" autoFocus />
        </Field>
        <Field label="Description" hint="Optional — shown under the module title.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description of this section"
            className="w-full resize-none rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-input border border-border bg-muted/40 px-3 py-2.5">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded border-border accent-[var(--color-accent)]" />
          <span className="text-sm text-foreground">Published <span className="text-muted-foreground">(visible to enrolled students)</span></span>
        </label>
      </form>
    </Modal>
  );
}

export default ModuleFormModal;
