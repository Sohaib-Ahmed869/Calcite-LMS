import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, CheckCircle, Circle, PlayCircle, Layers, Trophy, Download } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { Button } from '../../../components/ui';
import ProgressRing from './ProgressRing';
import { lessonIcon, lessonKindLabel, formatDuration } from './lessonType';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

/**
 * Udemy-style "Course content" panel: collapsible modules with per-module progress bars, lesson rows
 * with completion state + a "Now playing" marker, and a sticky footer (overall progress / certificate).
 */
export default function CourseContentSidebar({
  modules = [],
  progressMap = {},
  currentLessonId,
  onSelect,
  onClose,
  isCourseDone = false,
  onDownloadCertificate,
  downloadingCert = false,
}) {
  const [open, setOpen] = useState({});

  useEffect(() => {
    setOpen((prev) => {
      if (Object.keys(prev).length) return prev;
      return modules.reduce((acc, m) => ({ ...acc, [m._id]: true }), {});
    });
  }, [modules]);

  useEffect(() => {
    if (!currentLessonId) return;
    const owner = modules.find((m) => (m.lessons || []).some((l) => l._id === currentLessonId));
    if (owner) setOpen((p) => ({ ...p, [owner._id]: true }));
  }, [currentLessonId, modules]);

  const toggle = (id) => setOpen((p) => ({ ...p, [id]: !p[id] }));

  const moduleStats = (m) => {
    const lessons = m.lessons || [];
    const done = lessons.filter((l) => progressMap[l._id]?.isCompleted).length;
    return { done, total: lessons.length, pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
  };

  const totals = modules.reduce(
    (acc, m) => {
      for (const l of m.lessons || []) {
        acc.total += 1;
        if (progressMap[l._id]?.isCompleted) acc.done += 1;
      }
      return acc;
    },
    { done: 0, total: 0 },
  );
  const overallPct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <div className="flex h-full w-full flex-col bg-card">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Course content</h2>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              title="Hide course content"
              className="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" /> Hide
            </button>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {totals.done} of {totals.total} lessons complete
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-muted">
          <motion.div
            className="h-full rounded-pill"
            style={{ backgroundColor: 'var(--color-accent)' }}
            initial={false}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Modules */}
      <div className="scrollbar-none flex-1 overflow-y-auto">
        {modules.map((m) => {
          const isOpen = open[m._id];
          const { done, total, pct } = moduleStats(m);
          const isActiveModule = (m.lessons || []).some((l) => l._id === currentLessonId);
          return (
            <div key={m._id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => toggle(m._id)}
                className="flex w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/60"
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-accent" style={accentTint(isActiveModule ? 0.16 : 0.1)}>
                  <Layers className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-foreground">{m.title}</span>
                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">{pct}%</span>
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {done}/{total} lesson{total === 1 ? '' : 's'}
                  </span>
                  <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-pill bg-muted">
                    <span className="block h-full rounded-pill transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }} />
                  </span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <ul className="bg-muted/30 pb-1">
                      {(m.lessons || []).map((lesson) => {
                        const prog = progressMap[lesson._id];
                        const isCurrent = lesson._id === currentLessonId;
                        const isDone = prog?.isCompleted;
                        const Icon = lessonIcon(lesson.contentType);
                        return (
                          <li key={lesson._id}>
                            <button
                              type="button"
                              onClick={() => onSelect?.(lesson)}
                              className={cn('group/lesson flex w-full items-start gap-2 border-l-2 py-2 pl-4 pr-2 text-left transition-all', isCurrent ? '' : 'hover:bg-muted hover:pl-[1.125rem]')}
                              style={isCurrent ? { borderLeftColor: 'var(--color-accent)', ...accentTint(0.1) } : { borderLeftColor: 'transparent' }}
                            >
                              <span className="mt-0.5 shrink-0">
                                {isDone ? (
                                  <CheckCircle className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                                ) : isCurrent ? (
                                  <PlayCircle className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover/lesson:text-muted-foreground" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span
                                    className="truncate text-xs font-medium text-foreground"
                                    style={isCurrent ? { color: 'var(--color-accent)' } : undefined}
                                  >
                                    {lesson.title}
                                  </span>
                                </span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  {isCurrent ? (
                                    <span className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--color-accent)' }}>
                                      <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: 'var(--color-accent)' }} />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
                                      </span>
                                      Now playing
                                    </span>
                                  ) : (
                                    <span>{lessonKindLabel(lesson.contentType)}</span>
                                  )}
                                  {lesson.duration ? (
                                    <>
                                      <span>·</span>
                                      <span>{formatDuration(lesson.duration)}</span>
                                    </>
                                  ) : null}
                                  {lesson.isPreview ? (
                                    <>
                                      <span>·</span>
                                      <span className="font-medium" style={{ color: 'var(--color-accent)' }}>Preview</span>
                                    </>
                                  ) : null}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                      {(m.lessons || []).length === 0 ? (
                        <li className="px-4 py-2 text-[11px] text-muted-foreground">No lessons yet.</li>
                      ) : null}
                    </ul>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer — overall progress, or certificate when complete */}
      <div className="shrink-0 border-t border-border p-3">
        {isCourseDone ? (
          <div className="overflow-hidden rounded-card border border-border">
            <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: GRADIENT }}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-white">
                <Trophy className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Course completed!</p>
                <p className="text-[10px] text-white/80">Your certificate is ready</p>
              </div>
            </div>
            <div className="p-2">
              <Button size="sm" icon={Download} loading={downloadingCert} onClick={onDownloadCertificate} className="w-full">
                Download certificate
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-card bg-muted/50 p-3">
            <ProgressRing value={overallPct} size={44} stroke={4} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{overallPct}% complete</p>
              <p className="text-[10px] text-muted-foreground">Keep going — you’re doing great!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
