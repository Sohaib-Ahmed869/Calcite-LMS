import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  StickyNote,
  Bookmark,
  Star,
  CheckCircle,
  ChevronRight,
  Award,
  Download,
  Clock,
  Trophy,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { Button } from '../../../components/ui';
import ProgressRing from './ProgressRing';
import NotesPanel from './NotesPanel';
import BookmarksPanel from './BookmarksPanel';
import ReviewsPanel from './ReviewsPanel';

const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-card border border-border bg-card p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-accent" style={accentTint(0.1)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-base font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

/**
 * The panel beneath the player: a progress/action bar plus animated tabs
 * (Overview / Notes / Bookmarks / Reviews). Mark-complete + certificate actions live here.
 */
export default function LessonTabs({
  courseId,
  enrollment,
  totalLessons = 0,
  currentLesson,
  currentProgress,
  isVideo,
  getVideoTime,
  nextLesson,
  onNext,
  onToggleComplete,
  toggling = false,
  certificate,
  onDownloadCertificate,
  downloadingCert = false,
  notes = [],
  bookmarks = [],
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  onBookmarkCreated,
  onBookmarkDeleted,
  reviews,
  onReviewsUpdated,
}) {
  const [tab, setTab] = useState('overview');
  const pct = Math.round(enrollment?.progressPercent || 0);
  const completed = enrollment?.completedLessons || 0;
  const remaining = Math.max(0, totalLessons - completed);
  const isCourseDone = enrollment?.status === 'completed' || pct >= 100;
  const lessonDone = currentProgress?.isCompleted;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'notes', label: `Notes${notes.length ? ` (${notes.length})` : ''}`, icon: StickyNote },
    { id: 'bookmarks', label: `Bookmarks${bookmarks.length ? ` (${bookmarks.length})` : ''}`, icon: Bookmark },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <div className="border-t border-border bg-card">
      {/* Action / progress bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border bg-muted/40 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <ProgressRing value={pct} size={44} stroke={4} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Course progress</p>
            <p className="text-xs text-muted-foreground">
              {completed} of {totalLessons} lessons complete
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {currentLesson ? (
            lessonDone ? (
              <button
                type="button"
                onClick={onToggleComplete}
                disabled={toggling}
                title="Mark this lesson as not complete"
                className="group inline-flex items-center gap-1.5 rounded-btn border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/15 disabled:opacity-60"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="group-hover:hidden">Completed</span>
                <span className="hidden group-hover:inline">Mark incomplete</span>
              </button>
            ) : (
              <Button size="sm" icon={CheckCircle} loading={toggling} onClick={onToggleComplete}>
                Mark complete
              </Button>
            )
          ) : null}
          {nextLesson ? (
            <Button size="sm" variant="secondary" onClick={onNext} iconRight={ChevronRight}>
              Next lesson
            </Button>
          ) : null}
          {isCourseDone ? (
            <Button size="sm" variant="secondary" icon={Award} loading={downloadingCert} onClick={onDownloadCertificate}>
              Certificate
            </Button>
          ) : null}
        </div>
      </div>

      {/* Animated tabs */}
      <div className="border-b border-border">
        <nav className="scrollbar-none flex gap-1 overflow-x-auto px-4" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={cn(
                  'relative flex items-center gap-2 whitespace-nowrap px-3 py-3.5 text-sm font-semibold transition-colors',
                  active ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active ? (
                  <motion.span layoutId="lessonTabIndicator" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-5">
        {tab === 'overview' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile icon={CheckCircle} label="Completed" value={completed} />
              <StatTile icon={Clock} label="Remaining" value={remaining} />
              <StatTile icon={Trophy} label="Progress" value={`${pct}%`} />
            </div>

            <p className="text-[15px] leading-relaxed text-foreground">
              You’ve completed <strong style={{ color: 'var(--color-accent)' }}>{completed}</strong> of{' '}
              <strong>{totalLessons}</strong> lessons. {isCourseDone ? 'Brilliant — you’ve finished the course!' : 'Keep going — you’re making great progress.'}
            </p>

            {nextLesson ? (
              <section className="border-t border-border pt-4">
                <p className="mb-2 text-sm font-medium text-foreground">Next up</p>
                <button
                  type="button"
                  onClick={onNext}
                  className="group flex w-full items-center gap-3 rounded-card border border-border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-accent transition-transform group-hover:scale-105" style={accentTint(0.12)}>
                    <ChevronRight className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{nextLesson.title}</span>
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>Continue learning</span>
                  </span>
                </button>
              </section>
            ) : null}

            {isCourseDone ? (
              <section className="overflow-hidden rounded-card border border-border">
                <div className="flex items-center gap-3 px-4 py-4" style={{ background: 'linear-gradient(120deg, var(--color-primary), var(--color-accent))' }}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-white">
                    <Trophy className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white">Course completed 🎉</h3>
                    <p className="text-xs text-white/80">
                      Your certificate is ready{certificate?.certificateNumber ? ` · No. ${certificate.certificateNumber}` : ''}.
                    </p>
                  </div>
                </div>
                <div className="bg-card p-4">
                  <Button icon={Download} loading={downloadingCert} onClick={onDownloadCertificate}>
                    Download certificate
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === 'notes' ? (
          <NotesPanel
            lessonId={currentLesson?._id}
            notes={notes}
            isVideo={isVideo}
            getVideoTime={getVideoTime}
            onCreated={onNoteCreated}
            onUpdated={onNoteUpdated}
            onDeleted={onNoteDeleted}
          />
        ) : null}

        {tab === 'bookmarks' ? (
          <BookmarksPanel
            lessonId={currentLesson?._id}
            bookmarks={bookmarks}
            isVideo={isVideo}
            getVideoTime={getVideoTime}
            onCreated={onBookmarkCreated}
            onDeleted={onBookmarkDeleted}
          />
        ) : null}

        {tab === 'reviews' && courseId ? (
          <ReviewsPanel
            courseId={courseId}
            reviews={reviews?.reviews || []}
            averageRating={reviews?.averageRating || 0}
            count={reviews?.count || 0}
            onUpdated={onReviewsUpdated}
          />
        ) : null}
      </div>
    </div>
  );
}
