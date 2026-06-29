import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Award, List, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/cn';
import { useAdminUi } from '../../admin-ui/AdminUiContext';
import { Button, EmptyState } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import {
  getCourse,
  getModules,
  getLessons,
  getCourseProgress,
  getReviews,
  getCertificate,
  getNotes,
  getBookmarks,
  saveLessonProgress,
  setLessonComplete,
} from '../../services/lms.service';
import { normaliseType, lessonIcon, lessonKindLabel } from './lms/lessonType';
import CourseContentSidebar from './lms/CourseContentSidebar';
import LessonViewer from './lms/LessonViewer';
import LessonTabs from './lms/LessonTabs';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const COMPLETE_AT = 0.95; // auto-complete videos once 95% watched

/** Small progress ring rendered white-on-gradient for the header. */
function HeaderRing({ value = 0 }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  const size = 54, stroke = 4, r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = (pct / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`${pct}% complete`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} style={{ transition: 'stroke-dasharray .5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-white">{pct}%</div>
    </div>
  );
}

const navBtn = 'grid h-9 w-9 place-items-center rounded-lg border border-white/30 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40';

export function CoursePlayerPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed } = useAdminUi();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [modules, setModules] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [reviews, setReviews] = useState({ reviews: [], averageRating: 0, count: 0 });
  const [certificate, setCertificate] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const [playing, setPlaying] = useState(false);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const pendingTimeRef = useRef(0);
  const progressMapRef = useRef(progressMap);
  progressMapRef.current = progressMap;
  const completingRef = useRef(new Set());

  useEffect(() => {
    const prev = sidebarCollapsed;
    setSidebarCollapsed(true);
    return () => setSidebarCollapsed(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flatLessons = useMemo(() => modules.flatMap((m) => m.lessons || []), [modules]);

  const { prevLesson, nextLesson, lessonIndex } = useMemo(() => {
    if (!currentLesson) return { prevLesson: null, nextLesson: null, lessonIndex: -1 };
    const idx = flatLessons.findIndex((l) => l._id === currentLesson._id);
    return {
      prevLesson: idx > 0 ? flatLessons[idx - 1] : null,
      nextLesson: idx >= 0 && idx < flatLessons.length - 1 ? flatLessons[idx + 1] : null,
      lessonIndex: idx,
    };
  }, [currentLesson, flatLessons]);

  // ---- Load everything ------------------------------------------------
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const courseData = await getCourse(courseId);
        if (!alive) return;
        setCourse(courseData);
        setEnrollment(courseData.enrollment || null);

        const mods = await getModules(courseId);
        const withLessons = await Promise.all(
          (mods || []).map(async (m) => ({ ...m, lessons: await getLessons(m._id).catch(() => []) })),
        );
        if (!alive) return;
        setModules(withLessons);

        const prog = await getCourseProgress(courseId).catch(() => ({ lessons: [] }));
        const map = {};
        for (const p of prog.lessons || []) map[String(p.lessonId?._id || p.lessonId)] = p;
        if (!alive) return;
        setProgressMap(map);

        getReviews(courseId).then((d) => alive && setReviews(d)).catch(() => {});
        if (courseData.enrollment?.status === 'completed' || (courseData.enrollment?.progressPercent || 0) >= 100) {
          getCertificate(courseId).then((c) => alive && setCertificate(c)).catch(() => {});
        }

        const all = withLessons.flatMap((m) => m.lessons || []);
        const firstIncomplete = all.find((l) => !map[l._id]?.isCompleted);
        if (alive) setCurrentLesson(firstIncomplete || all[0] || null);
      } catch (e) {
        if (alive) setError(e.status === 403 ? 'not-enrolled' : e.message || 'Failed to load this course.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [courseId]);

  // ---- Progress flushing ---------------------------------------------
  const flushProgress = useCallback((lessonId) => {
    if (!lessonId) return;
    const delta = pendingTimeRef.current;
    const pos = Math.round(positionRef.current || 0);
    pendingTimeRef.current = 0;
    if (delta <= 0 && pos <= 0) return;
    saveLessonProgress(lessonId, { lastViewedPosition: pos, progressSeconds: pos, timeSpentDelta: delta }).catch(() => {});
    setProgressMap((prev) => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        lastViewedPosition: pos,
        progressSeconds: pos,
        timeSpentSeconds: (prev[lessonId]?.timeSpentSeconds || 0) + delta,
      },
    }));
  }, []);

  const markComplete = useCallback(
    async (lessonId, isCompleted) => {
      if (!lessonId) return;
      try {
        const res = await setLessonComplete(lessonId, isCompleted);
        const enr = res?.enrollment;
        setProgressMap((prev) => ({ ...prev, [lessonId]: { ...prev[lessonId], ...(res?.progress || {}), isCompleted } }));
        if (enr) setEnrollment(enr);
        if (isCompleted && enr?.status === 'completed') {
          toast.success('Course completed — certificate ready! 🎉');
          getCertificate(courseId).then(setCertificate).catch(() => {});
        }
      } catch (e) {
        toast.error(e.message || 'Failed to update progress');
      }
    },
    [courseId],
  );

  useEffect(() => {
    const id = currentLesson?._id;
    pendingTimeRef.current = 0;
    positionRef.current = 0;
    durationRef.current = 0;
    setPlaying(false);
    if (id) {
      getNotes(id).then(setNotes).catch(() => setNotes([]));
      getBookmarks(id).then(setBookmarks).catch(() => setBookmarks([]));
    } else {
      setNotes([]);
      setBookmarks([]);
    }
    return () => {
      if (id) flushProgress(id);
    };
  }, [currentLesson?._id, flushProgress]);

  useEffect(() => {
    if (!playing || !currentLesson?._id) return undefined;
    const id = currentLesson._id;
    const t = setInterval(() => {
      pendingTimeRef.current += 1;
      if (pendingTimeRef.current % 15 === 0) flushProgress(id);
    }, 1000);
    return () => clearInterval(t);
  }, [playing, currentLesson?._id, flushProgress]);

  const handleTime = useCallback(
    (seconds, duration) => {
      positionRef.current = seconds || 0;
      durationRef.current = duration || 0;
      const id = currentLesson?._id;
      if (!id || !duration) return;
      if (seconds / duration >= COMPLETE_AT && !progressMapRef.current[id]?.isCompleted && !completingRef.current.has(id)) {
        completingRef.current.add(id);
        markComplete(id, true);
      }
    },
    [currentLesson?._id, markComplete],
  );

  const handleEnded = useCallback(() => {
    const id = currentLesson?._id;
    if (id && !progressMapRef.current[id]?.isCompleted) markComplete(id, true);
    if (nextLesson) setCurrentLesson(nextLesson);
  }, [currentLesson?._id, nextLesson, markComplete]);

  const handleToggleComplete = useCallback(async () => {
    const id = currentLesson?._id;
    if (!id) return;
    setToggling(true);
    await markComplete(id, !progressMapRef.current[id]?.isCompleted);
    completingRef.current.delete(id);
    setToggling(false);
  }, [currentLesson?._id, markComplete]);

  const handleDownloadCertificate = useCallback(async () => {
    setDownloadingCert(true);
    try {
      const cert = await getCertificate(courseId);
      setCertificate(cert);
      if (cert?.downloadUrl) window.open(cert.downloadUrl, '_blank', 'noopener');
      else toast.error('Certificate is not ready yet.');
    } catch (e) {
      toast.error(e.message || 'Could not fetch certificate');
    } finally {
      setDownloadingCert(false);
    }
  }, [courseId]);

  const getVideoTime = useCallback(() => positionRef.current || 0, []);
  const isVideo = currentLesson ? normaliseType(currentLesson.contentType) === 'video' : false;
  const currentProgress = currentLesson ? progressMap[currentLesson._id] : null;
  const pct = Math.round(enrollment?.progressPercent || 0);
  const totalLessons = course?.totalLessons || flatLessons.length;
  const completed = enrollment?.completedLessons || 0;
  const isCourseDone = enrollment?.status === 'completed' || pct >= 100;
  const LessonIcon = currentLesson ? lessonIcon(currentLesson.contentType) : BookOpen;

  // ---- Render ---------------------------------------------------------
  if (loading) return <AdminLoader label="Loading course…" />;

  if (error) {
    return (
      <EmptyState
        icon={BookOpen}
        title={error === 'not-enrolled' ? 'You’re not enrolled in this course' : 'Couldn’t open this course'}
        description={error === 'not-enrolled' ? 'Please contact your administrator to be enrolled.' : error}
        action={<Button icon={ArrowLeft} onClick={() => navigate('/learn')}>Back to My Learning</Button>}
      />
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Gradient header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="px-5 py-5 sm:px-7" style={{ background: GRADIENT }}>
          <button type="button" onClick={() => navigate('/learn')} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> My Learning
          </button>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-white sm:text-2xl">{course?.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/80">
                <span className="capitalize">{course?.level || 'beginner'}</span>
                <span>· {totalLessons} lessons</span>
                <span>· {completed} completed</span>
                {isCourseDone ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
                    <Award className="h-3 w-3" /> Completed
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button type="button" className={navBtn} title="Previous lesson" disabled={!prevLesson} onClick={() => prevLesson && setCurrentLesson(prevLesson)}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" className={navBtn} title="Next lesson" disabled={!nextLesson} onClick={() => nextLesson && setCurrentLesson(nextLesson)}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <HeaderRing value={pct} />
            </div>
          </div>
        </div>
      </div>

      {/* Player card */}
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        {/* Lesson sub-bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-accent" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)' }}>
              <LessonIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{currentLesson?.title || 'Select a lesson'}</p>
              <p className="text-[11px] text-muted-foreground">
                {currentLesson ? lessonKindLabel(currentLesson.contentType) : '—'}
                {lessonIndex >= 0 ? ` · Lesson ${lessonIndex + 1} of ${flatLessons.length}` : ''}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" icon={List} onClick={() => setShowSidebar((s) => !s)}>
            <span className="hidden sm:inline">{showSidebar ? 'Hide content' : 'Show content'}</span>
          </Button>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Left: viewer + tabs */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="group relative bg-black" style={{ height: '56vh', minHeight: 360 }}>
              {currentLesson ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentLesson._id}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LessonViewer
                      lesson={currentLesson}
                      startAt={currentProgress?.lastViewedPosition || 0}
                      onTime={handleTime}
                      onEnded={handleEnded}
                      onPlayingChange={setPlaying}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
                  {flatLessons.length === 0 ? 'This course has no lessons yet.' : 'Select a lesson to begin.'}
                </div>
              )}

              {/* Hover prev/next overlay */}
              {currentLesson && prevLesson ? (
                <button
                  type="button"
                  onClick={() => setCurrentLesson(prevLesson)}
                  title="Previous lesson"
                  className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity duration-200 hover:bg-black/75 group-hover:opacity-100"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              ) : null}
              {currentLesson && nextLesson ? (
                <button
                  type="button"
                  onClick={() => setCurrentLesson(nextLesson)}
                  title="Next lesson"
                  className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity duration-200 hover:bg-black/75 group-hover:opacity-100"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              ) : null}

              {/* Reveal content panel when hidden */}
              {!showSidebar ? (
                <button
                  type="button"
                  onClick={() => setShowSidebar(true)}
                  title="Show course content"
                  className="absolute right-3 top-3 z-20 inline-flex items-center gap-2 rounded-btn bg-black/70 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-black/85"
                >
                  <List className="h-4 w-4" /> Content
                </button>
              ) : null}
            </div>

            <LessonTabs
              courseId={courseId}
              enrollment={enrollment}
              totalLessons={totalLessons}
              currentLesson={currentLesson}
              currentProgress={currentProgress}
              isVideo={isVideo}
              getVideoTime={getVideoTime}
              nextLesson={nextLesson}
              onNext={() => nextLesson && setCurrentLesson(nextLesson)}
              onToggleComplete={handleToggleComplete}
              toggling={toggling}
              certificate={certificate}
              onDownloadCertificate={handleDownloadCertificate}
              downloadingCert={downloadingCert}
              notes={notes}
              bookmarks={bookmarks}
              onNoteCreated={(n) => setNotes((p) => [...p, n])}
              onNoteUpdated={(n) => setNotes((p) => p.map((x) => (x._id === n._id ? n : x)))}
              onNoteDeleted={(id) => setNotes((p) => p.filter((x) => x._id !== id))}
              onBookmarkCreated={(b) => setBookmarks((p) => [...p, b])}
              onBookmarkDeleted={(id) => setBookmarks((p) => p.filter((x) => x._id !== id))}
              reviews={reviews}
              onReviewsUpdated={setReviews}
            />
          </div>

          {/* Right: course content panel (collapsible) */}
          <div
            className={cn('shrink-0 self-stretch overflow-hidden border-l border-border transition-[width] duration-300 ease-in-out')}
            style={{ width: showSidebar ? 320 : 0 }}
          >
            <div className="flex h-full w-80 flex-col">
              <CourseContentSidebar
                modules={modules}
                progressMap={progressMap}
                currentLessonId={currentLesson?._id}
                onSelect={(lesson) => setCurrentLesson(lesson)}
                onClose={() => setShowSidebar(false)}
                isCourseDone={isCourseDone}
                onDownloadCertificate={handleDownloadCertificate}
                downloadingCert={downloadingCert}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoursePlayerPage;
