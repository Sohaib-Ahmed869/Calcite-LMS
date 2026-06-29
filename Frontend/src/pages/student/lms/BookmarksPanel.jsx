import { useState } from 'react';
import { Plus, Bookmark, Trash2, Clock, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui';
import { createBookmark, deleteBookmark } from '../../../services/lms.service';
import { formatDuration } from './lessonType';
import EmptyState from './EmptyState';

const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

/** Per-lesson bookmarks. For video lessons a bookmark captures the playback time when opened. */
export default function BookmarksPanel({ lessonId, bookmarks = [], isVideo = false, getVideoTime, onCreated, onDeleted }) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [draftTs, setDraftTs] = useState(0);
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setDraftTs(isVideo && typeof getVideoTime === 'function' ? Math.round(getVideoTime() || 0) : 0);
    setTitle('');
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!title.trim() || !lessonId) return;
    setBusy(true);
    try {
      const bm = await createBookmark(lessonId, { title: title.trim(), timestamp: draftTs });
      onCreated?.(bm);
      setTitle('');
      setCreating(false);
    } catch (e) {
      toast.error(e.message || 'Failed to add bookmark');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBookmark(id);
      onDeleted?.(id);
    } catch (e) {
      toast.error(e.message || 'Failed to remove bookmark');
    }
  };

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
          Add a bookmark{isVideo ? ' at the current time' : ''}…
        </button>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bookmark className="h-4 w-4 text-accent" /> New bookmark
            </span>
            {isVideo ? (
              <span className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium text-accent" style={accentTint(0.12)}>
                <Clock className="h-3 w-3" /> at {formatDuration(draftTs) || '0:00'}
              </span>
            ) : null}
          </div>
          <div className="space-y-3 p-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Bookmark title…"
              autoFocus
              className="w-full rounded-input border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setTitle(''); }}>Cancel</Button>
              <Button size="sm" icon={Check} loading={busy} disabled={!title.trim()} onClick={handleCreate}>Save bookmark</Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {bookmarks.length === 0 && !creating ? (
        <EmptyState compact icon={Bookmark} title="No bookmarks yet" message="Save moments you want to revisit." />
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bm) => (
            <div key={bm._id} className="group flex items-start gap-3 rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-soft">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-accent" style={accentTint(0.12)}>
                <Bookmark className="h-4 w-4 fill-current" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{bm.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {bm.timestamp > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDuration(bm.timestamp)}
                    </span>
                  ) : null}
                  <span>{new Date(bm.createdAt).toLocaleDateString()}</span>
                </p>
              </div>
              <button type="button" onClick={() => handleDelete(bm._id)} title="Remove bookmark" className="shrink-0 rounded-btn p-1.5 text-danger transition-colors hover:bg-danger/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
