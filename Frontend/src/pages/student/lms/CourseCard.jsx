import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Clock, Play, ChevronRight, Star, Layers, GraduationCap } from 'lucide-react';
import { Card, Badge, Button } from '../../../components/ui';

/**
 * An enrolled-course card (grid or list view), matching the admin Courses look:
 * a 16:9 cover (image or brand gradient), a status badge, meta row and a learning-progress bar.
 * Expects a "my courses" item: { status, progressPercent, completedLessons, course }.
 */
const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function statusMeta(progress, status) {
  if (progress >= 100 || status === 'completed') return { label: 'Completed', tone: 'success', Icon: CheckCircle };
  if (progress > 0) return { label: 'In Progress', tone: 'accent', Icon: Clock };
  return { label: 'Not Started', tone: 'muted', Icon: BookOpen };
}

function Cover({ course, className = '' }) {
  const [imgError, setImgError] = useState(false);
  return course.coverImageUrl && !imgError ? (
    <img src={course.coverImageUrl} alt={course.title} onError={() => setImgError(true)} className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${className}`} />
  ) : (
    <span className={`flex h-full w-full items-center justify-center ${className}`} style={{ background: GRADIENT }}>
      <BookOpen className="h-10 w-10 text-white/80" />
    </span>
  );
}

function ProgressBar({ progress, completed, total }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>{progress}% complete</span>
        <span className="text-muted-foreground">{completed}/{total} lessons</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-muted">
        <div className="h-full rounded-pill transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent)' }} />
      </div>
    </div>
  );
}

export default function CourseCard({ item, viewMode = 'grid', onOpen }) {
  const course = item.course || {};
  const progress = Math.round(item.progressPercent || 0);
  const total = course.totalLessons || 0;
  const completed = item.completedLessons || 0;
  const rating = course.averageRating || 0;
  const meta = statusMeta(progress, item.status);
  const cta = progress >= 100 ? 'Revisit' : progress > 0 ? 'Continue' : 'Start';

  if (viewMode === 'list') {
    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
        <Card className="group flex items-center gap-4 p-3">
          <button type="button" onClick={onOpen} className="relative block aspect-video w-40 shrink-0 overflow-hidden rounded-btn text-left">
            <Cover course={course} />
            <span className="absolute left-2 top-2">
              <Badge tone={meta.tone}><meta.Icon className="h-3 w-3" /> {meta.label}</Badge>
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={onOpen} className="text-left">
              <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-accent">{course.title}</h3>
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 capitalize"><Layers className="h-3.5 w-3.5" /> {course.level || 'beginner'}</span>
              <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {total} lessons</span>
              {rating ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> {rating}</span> : null}
            </div>
            <div className="mt-2 max-w-md">
              <ProgressBar progress={progress} completed={completed} total={total} />
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Button size="sm" onClick={onOpen} icon={Play} iconRight={ChevronRight}>{cta}</Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card className="group flex h-full flex-col overflow-hidden p-0">
        <button type="button" onClick={onOpen} className="relative block aspect-[16/9] w-full overflow-hidden text-left">
          <Cover course={course} />
          <span className="absolute left-3 top-3">
            <Badge tone={meta.tone}><meta.Icon className="h-3 w-3" /> {meta.label}</Badge>
          </span>
          {course.level ? (
            <span className="absolute right-3 top-3 rounded-pill bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {LEVEL_LABEL[course.level] || course.level}
            </span>
          ) : null}
        </button>

        <div className="flex flex-1 flex-col p-4">
          <button type="button" onClick={onOpen} className="text-left">
            <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-accent">{course.title}</h3>
            <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">
              {course.summary || course.description || 'No description yet.'}
            </p>
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 capitalize"><Layers className="h-3.5 w-3.5" /> {course.level || 'beginner'}</span>
            <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {total} lessons</span>
            <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {completed} done</span>
            {rating ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> {rating}</span> : null}
          </div>

          <div className="mt-3">
            <ProgressBar progress={progress} completed={completed} total={total} />
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <Button size="sm" onClick={onOpen} icon={Play} iconRight={ChevronRight} className="w-full">
              {cta} learning
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
