import { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, StickyNote, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui';
import { createNote, updateNote, deleteNote } from '../../../services/lms.service';
import { formatDuration } from './lessonType';
import EmptyState from './EmptyState';

const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });
const tsLabel = (ts) => (ts != null ? formatDuration(ts) || '0:00' : null);

/**
 * Per-lesson notes. Plain-text notes; for video lessons a note captures the playback time when the
 * composer is opened. Mutations call the API then bubble up via callbacks.
 */
export default function NotesPanel({ lessonId, notes = [], isVideo = false, getVideoTime, onCreated, onUpdated, onDeleted }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftTs, setDraftTs] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setDraftTs(isVideo && typeof getVideoTime === 'function' ? Math.round(getVideoTime() || 0) : null);
    setDraft('');
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!draft.trim() || !lessonId) return;
    setBusy(true);
    try {
      const note = await createNote(lessonId, { noteText: draft.trim(), timestamp: draftTs });
      onCreated?.(note);
      setDraft('');
      setCreating(false);
    } catch (e) {
      toast.error(e.message || 'Failed to save note');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editDraft.trim()) return;
    setBusy(true);
    try {
      const note = await updateNote(id, { noteText: editDraft.trim() });
      onUpdated?.(note);
      setEditingId(null);
      setEditDraft('');
    } catch (e) {
      toast.error(e.message || 'Failed to update note');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteNote(id);
      onDeleted?.(id);
    } catch (e) {
      toast.error(e.message || 'Failed to delete note');
    }
  };

  const textareaCls =
    'w-full resize-none rounded-input border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20';

  return (
    <div className="space-y-4">
      {/* Composer */}
      {!creating ? (
        <button
          type="button"
          onClick={startCreate}
          disabled={!lessonId}
          className="group flex w-full items-center gap-3 rounded-card border border-dashed border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-50"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-accent transition-transform group-hover:scale-105" style={accentTint(0.12)}>
            <Plus className="h-4 w-4" />
          </span>
          Add a note{isVideo ? ' at the current time' : ''}…
        </button>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <StickyNote className="h-4 w-4 text-accent" /> New note
            </span>
            {draftTs != null ? (
              <span className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium text-accent" style={accentTint(0.12)}>
                <Clock className="h-3 w-3" /> at {tsLabel(draftTs)}
              </span>
            ) : null}
          </div>
          <div className="space-y-3 p-4">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write your note…" rows={4} autoFocus className={textareaCls} />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setDraft(''); }}>Cancel</Button>
              <Button size="sm" icon={Check} loading={busy} disabled={!draft.trim()} onClick={handleCreate}>Save note</Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {notes.length === 0 && !creating ? (
        <EmptyState compact icon={StickyNote} title="No notes yet" message="Jot down key points as you learn." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note._id} className="rounded-card border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-soft">
              {editingId === note._id ? (
                <div className="space-y-3">
                  <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={3} autoFocus className={textareaCls} />
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditDraft(''); }}>Cancel</Button>
                    <Button size="sm" icon={Check} loading={busy} disabled={!editDraft.trim()} onClick={() => handleUpdate(note._id)}>Save</Button>
                  </div>
                </div>
              ) : (
                <>
                  {note.timestamp != null ? (
                    <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11px] font-medium text-accent" style={accentTint(0.1)}>
                      <Clock className="h-3 w-3" /> {tsLabel(note.timestamp)}
                    </div>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-foreground">{note.noteText}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                    <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { setEditingId(note._id); setEditDraft(note.noteText || ''); }} title="Edit" className="rounded-btn p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete(note._id)} title="Delete" className="rounded-btn p-1.5 text-danger transition-colors hover:bg-danger/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
