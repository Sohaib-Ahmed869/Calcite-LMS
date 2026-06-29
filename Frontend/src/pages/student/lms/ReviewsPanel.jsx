import { useState } from 'react';
import { Star, ThumbsUp, MessageSquarePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../auth/AuthProvider';
import { submitReview, toggleReviewHelpful, getReviews } from '../../../services/lms.service';
import { initials } from '../../../lib/format';
import EmptyState from './EmptyState';

function Stars({ value = 0, onChange, size = 'h-4 w-4' }) {
  const interactive = typeof onChange === 'function';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange(n)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star className={`${size} ${n <= value ? 'fill-warning text-warning' : 'text-muted-foreground/40'}`} />
        </button>
      ))}
    </div>
  );
}

/** Course-wide reviews: average summary, my review form (upsert), the list, and a helpful toggle. */
export default function ReviewsPanel({ courseId, reviews = [], averageRating = 0, count = 0, onUpdated }) {
  const { user } = useAuth();
  const myId = user?._id || user?.id;
  const myReview = reviews.find((r) => String(r.student?._id) === String(myId));

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const data = await getReviews(courseId);
      onUpdated?.(data);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please choose a rating');
      return;
    }
    setBusy(true);
    try {
      await submitReview(courseId, { rating, reviewText: text.trim() });
      await refresh();
      setShowForm(false);
      setRating(0);
      setText('');
      toast.success('Thanks for your review!');
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setBusy(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await toggleReviewHelpful(reviewId);
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const openEdit = () => {
    if (myReview) {
      setRating(myReview.rating);
      setText(myReview.reviewText || '');
    }
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-foreground">{Number(averageRating).toFixed(1)}</span>
          <Stars value={Math.round(averageRating)} />
          <span className="text-xs text-muted-foreground">
            {count} review{count === 1 ? '' : 's'}
          </span>
        </div>
        {!showForm ? (
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-2 rounded-btn px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <MessageSquarePlus className="h-4 w-4" /> {myReview ? 'Edit your review' : 'Write a review'}
          </button>
        ) : null}
      </div>

      {/* Form */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-card border border-border bg-muted/40 p-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-foreground">Your rating</span>
            <Stars value={rating} onChange={setRating} size="h-6 w-6" />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-foreground">Your review (optional)</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Share your experience with this course…"
              className="w-full resize-none rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-btn px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {busy ? 'Submitting…' : 'Submit review'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setRating(0);
                setText('');
              }}
              className="rounded-btn bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {/* List */}
      {reviews.length === 0 ? (
        <EmptyState compact icon={Star} title="No reviews yet" message="Be the first to review this course." />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const mine = String(r.student?._id) === String(myId);
            return (
              <div
                key={r._id}
                className="rounded-card border bg-card p-3 shadow-card"
                style={mine ? { borderColor: 'var(--color-accent)', backgroundColor: 'rgba(var(--color-accent-rgb), 0.05)' } : undefined}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-xs font-semibold text-white"
                    style={{ backgroundColor: mine ? 'var(--color-accent)' : 'var(--color-mutedForeground)' }}
                  >
                    {initials(`${r.student?.firstName || ''} ${r.student?.lastName || ''}`)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {r.student?.firstName} {r.student?.lastName}
                      </span>
                      {mine ? (
                        <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                          (You)
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{r.createdAt && new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-0.5">
                      <Stars value={r.rating} />
                    </div>
                    {r.reviewText ? <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{r.reviewText}</p> : null}
                    {!mine ? (
                      <button
                        type="button"
                        onClick={() => handleHelpful(r._id)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                        style={{ color: r.markedHelpful ? 'var(--color-accent)' : 'var(--color-mutedForeground)' }}
                      >
                        <ThumbsUp className={`h-3.5 w-3.5 ${r.markedHelpful ? 'fill-current' : ''}`} />
                        Helpful ({r.helpfulCount || 0})
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
