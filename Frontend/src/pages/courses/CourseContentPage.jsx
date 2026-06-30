import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Layers,
  BookOpen,
  Clock,
  Globe,
  Pencil,
  Trash2,
  Eye,
  GlobeLock,
  Settings2,
  Sparkles,
  GraduationCap,
  Tag,
  FolderOpen,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card, Badge, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { AdminLoader } from '../../admin-ui/Loader';
import { CourseService, ModuleService, LessonService } from '../../services/course.service';
import { ModuleFormModal } from './modals/ModuleFormModal';
import { LessonFormModal } from './modals/LessonFormModal';
import { LessonPreviewModal } from './modals/LessonPreviewModal';
import { CourseFormModal } from './modals/CourseFormModal';
import { lessonIcon, formatDuration } from './courseContent.utils';

const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

/* ── Small building blocks ───────────────────────────────────────────────────── */
function HeroChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-inset ring-white/20">
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-accent" style={accentTint(0.1)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

/* ── Lesson row ──────────────────────────────────────────────────────────────── */
function LessonRow({ lesson, onPreview, onEdit, onDelete, onTogglePublish, onPersist }) {
  const controls = useDragControls();
  const Icon = lessonIcon(lesson.contentType, lesson.mimeType);
  const dur = formatDuration(lesson.duration);
  return (
    <Reorder.Item
      value={lesson}
      as="div"
      dragListener={false}
      dragControls={controls}
      onDragEnd={onPersist}
      whileDrag={{ scale: 1.01, boxShadow: 'var(--card-shadow)' }}
      className="group flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:border-accent/40"
    >
      <button type="button" onPointerDown={(e) => controls.start(e)} className="cursor-grab touch-none p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing" title="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-accent" style={accentTint(0.1)}>
        <Icon className="h-4 w-4" />
      </span>
      <button type="button" onClick={onPreview} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-foreground">{lesson.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="capitalize">{lesson.contentType || 'file'}</span>
          {dur ? <span>· {dur}</span> : null}
          {lesson.isPreview ? <span className="text-accent">· Free preview</span> : null}
          {!lesson.isPublished ? <span className="text-warning">· Draft</span> : null}
        </div>
      </button>
      <div className="flex items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Button size="iconSm" variant="ghost" icon={Eye} onClick={onPreview} title="Preview" />
        <Button size="iconSm" variant="ghost" icon={Pencil} onClick={onEdit} title="Edit" />
        <button type="button" onClick={onTogglePublish} className={cn('hidden rounded-md px-2 py-1 text-[11px] font-semibold transition-colors sm:inline-block', lesson.isPublished ? 'text-muted-foreground hover:text-foreground' : 'text-accent')}>
          {lesson.isPublished ? 'Unpublish' : 'Publish'}
        </button>
        <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={onDelete} title="Delete" />
      </div>
    </Reorder.Item>
  );
}

/* ── Module card ─────────────────────────────────────────────────────────────── */
function ModuleCard({ module, expanded, onToggle, onPersistModules, onReorderLessons, onPersistLessons, onAddLesson, onEditModule, onDeleteModule, onToggleModulePublish, lessonHandlers }) {
  const controls = useDragControls();
  const lessons = module.lessons || [];
  const live = lessons.filter((l) => l.isPublished).length;
  const dur = formatDuration(lessons.reduce((s, l) => s + (l.duration || 0), 0));

  return (
    <Reorder.Item
      value={module}
      as="div"
      dragListener={false}
      dragControls={controls}
      onDragEnd={onPersistModules}
      whileDrag={{ scale: 1.005, boxShadow: 'var(--card-shadow)' }}
      className="relative overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift"
    >
      {/* Status accent strip */}
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: module.isPublished ? 'var(--color-accent)' : 'var(--color-warning)' }} />

      {/* Header */}
      <div className="flex items-center gap-2 p-3 pl-4">
        <button type="button" onPointerDown={(e) => controls.start(e)} className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing" title="Drag to reorder">
          <GripVertical className="h-4.5 w-4.5" />
        </button>
        <button type="button" onClick={onToggle} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-accent" style={accentTint(0.12)}>
          <Layers className="h-4.5 w-4.5" />
        </span>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-foreground">{module.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {lessons.length} resource{lessons.length === 1 ? '' : 's'}
            {lessons.length ? ` · ${live} live` : ''}
            {dur ? ` · ${dur}` : ''}
          </p>
        </button>
        <Badge tone={module.isPublished ? 'success' : 'warning'} className="hidden sm:inline-flex">{module.isPublished ? 'Published' : 'Draft'}</Badge>
        <Button size="iconSm" variant="ghost" icon={module.isPublished ? Globe : GlobeLock} onClick={onToggleModulePublish} title={module.isPublished ? 'Unpublish module' : 'Publish module'} />
        <Button size="iconSm" variant="ghost" icon={Pencil} onClick={onEditModule} title="Edit module" />
        <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={onDeleteModule} title="Delete module" />
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="overflow-hidden">
            <div className="border-t border-border bg-muted/30 py-3 pr-3 pl-6 sm:pl-8">
              {/* nested under the chapter — indented with a vertical guide line */}
              <div className="space-y-2 border-l-2 border-border pl-3 sm:pl-4">
                {lessons.length === 0 ? (
                  <p className="px-1 py-3 text-center text-xs text-muted-foreground">No resources yet — add a document, video, link or text.</p>
                ) : (
                  <Reorder.Group axis="y" as="div" values={lessons} onReorder={(next) => onReorderLessons(module._id, next)} className="space-y-2">
                    {lessons.map((l) => (
                      <LessonRow
                        key={l._id}
                        lesson={l}
                        onPersist={() => onPersistLessons(module._id)}
                        onPreview={() => lessonHandlers.preview(l)}
                        onEdit={() => lessonHandlers.edit(module, l)}
                        onDelete={() => lessonHandlers.remove(l)}
                        onTogglePublish={() => lessonHandlers.requestPublish(l)}
                      />
                    ))}
                  </Reorder.Group>
                )}
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => onAddLesson(module)} className="w-full">Add resource</Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Reorder.Item>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────────── */
// Per-course content cache (course + modules-with-lessons), kept OUTSIDE React so revisiting a
// course renders instantly while it revalidates in the background — no loader flash on every visit.
const contentCache = new Map();

export function CourseContentPage() {
  const { courseId } = useParams();
  const cached = contentCache.get(courseId);
  const [course, setCourse] = useState(cached?.course ?? null);
  const [modules, setModules] = useState(cached?.modules ?? []);
  const [loading, setLoading] = useState(!cached); // only "loading" when there's nothing cached
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [statusSaving, setStatusSaving] = useState(false);

  // Modal / dialog state
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [moduleModal, setModuleModal] = useState({ open: false, module: null });
  const [lessonModal, setLessonModal] = useState({ open: false, moduleId: null, lesson: null });
  const [preview, setPreview] = useState({ open: false, lesson: null });
  const [confirm, setConfirm] = useState(null); // { kind:'course'|'module'|'lesson', item, label }
  const [removing, setRemoving] = useState(false);
  const [pubConfirm, setPubConfirm] = useState(null); // publish/unpublish confirmation: { kind, item }
  const [publishing, setPublishing] = useState(false);

  const modulesRef = useRef(modules);
  modulesRef.current = modules;

  const loadCourse = useCallback(() => {
    CourseService.get(courseId).then(setCourse).catch(() => {});
  }, [courseId]);

  const loadModules = useCallback(async () => {
    const mods = await ModuleService.list(courseId);
    const withLessons = await Promise.all(
      (mods || []).map(async (m) => ({ ...m, lessons: (await LessonService.list(m._id)) || [] })),
    );
    setModules(withLessons);
    setExpanded((prev) => {
      // Expand everything the first time; preserve user toggles afterwards.
      if (Object.keys(prev).length) return prev;
      return Object.fromEntries(withLessons.map((m) => [m._id, true]));
    });
    return withLessons;
  }, [courseId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([CourseService.get(courseId).then(setCourse), loadModules()]);
    } catch (e) {
      setError(e.message || 'Failed to load course content');
    } finally {
      setLoading(false);
    }
  }, [courseId, loadModules]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Mirror the on-screen data into the cache so a later revisit shows the latest instantly.
  // Guard on _id so we never store one course's data under another course's id mid-navigation.
  useEffect(() => {
    if (course && course._id === courseId) contentCache.set(courseId, { course, modules });
  }, [courseId, course, modules]);

  const stats = useMemo(() => {
    const lessons = modules.flatMap((m) => m.lessons || []);
    return {
      modules: modules.length,
      lessons: lessons.length,
      published: lessons.filter((l) => l.isPublished).length,
      duration: formatDuration(lessons.reduce((s, l) => s + (l.duration || 0), 0)) || '—',
    };
  }, [modules]);

  const allExpanded = modules.length > 0 && modules.every((m) => expanded[m._id]);
  const toggleAll = () => setExpanded(allExpanded ? {} : Object.fromEntries(modules.map((m) => [m._id, true])));

  const tags = Array.isArray(course?.tags) ? course.tags.filter(Boolean) : [];

  /* Reorder persistence */
  const persistModules = useCallback(() => {
    const ids = modulesRef.current.map((m) => m._id);
    ModuleService.reorder(courseId, ids).catch((e) => { toast.error(e.message || 'Reorder failed'); loadModules(); });
  }, [courseId, loadModules]);

  const reorderLessons = useCallback((moduleId, next) => {
    setModules((prev) => prev.map((m) => (m._id === moduleId ? { ...m, lessons: next } : m)));
  }, []);

  const persistLessons = useCallback((moduleId) => {
    const mod = modulesRef.current.find((m) => m._id === moduleId);
    if (!mod) return;
    LessonService.reorder(moduleId, mod.lessons.map((l) => l._id)).catch((e) => { toast.error(e.message || 'Reorder failed'); loadModules(); });
  }, [loadModules]);

  /* Course actions */
  const toggleCoursePublish = async () => {
    const next = course.status === 'published' ? 'draft' : 'published';
    setStatusSaving(true);
    try {
      const updated = await CourseService.publish(course._id, next);
      setCourse((c) => ({ ...c, status: updated?.status || next }));
      toast.success(next === 'published' ? 'Course published' : 'Course unpublished');
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  /* Module actions */
  const toggleModulePublish = async (m) => {
    try {
      await ModuleService.update(m._id, { isPublished: !m.isPublished });
      setModules((prev) => prev.map((x) => (x._id === m._id ? { ...x, isPublished: !m.isPublished } : x)));
      toast.success(m.isPublished ? 'Module hidden' : 'Module published');
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  /* Lesson actions */
  const lessonHandlers = {
    preview: (l) => setPreview({ open: true, lesson: l }),
    edit: (m, l) => setLessonModal({ open: true, moduleId: m._id, lesson: l }),
    remove: (l) => setConfirm({ kind: 'lesson', item: l, label: l.title }),
    requestPublish: (l) => setPubConfirm({ kind: 'lesson', item: l }),
    togglePublish: async (l) => {
      try {
        await LessonService.publish(l._id, !l.isPublished);
        setModules((prev) => prev.map((m) => ({ ...m, lessons: (m.lessons || []).map((x) => (x._id === l._id ? { ...x, isPublished: !l.isPublished } : x)) })));
        toast.success(l.isPublished ? 'Resource unpublished' : 'Resource published');
        loadCourse();
      } catch (e) {
        toast.error(e.message || 'Failed');
      }
    },
  };

  const doDelete = async () => {
    if (!confirm) return;
    setRemoving(true);
    try {
      if (confirm.kind === 'module') {
        await ModuleService.remove(confirm.item._id);
        toast.success('Module deleted');
      } else {
        await LessonService.remove(confirm.item._id);
        toast.success('Resource deleted');
      }
      setConfirm(null);
      await loadModules();
      loadCourse();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setRemoving(false);
    }
  };

  const doTogglePublish = async () => {
    if (!pubConfirm) return;
    const { kind, item } = pubConfirm;
    setPublishing(true);
    try {
      if (kind === 'course') await toggleCoursePublish();
      else if (kind === 'module') await toggleModulePublish(item);
      else await lessonHandlers.togglePublish(item);
      setPubConfirm(null);
    } finally {
      setPublishing(false);
    }
  };

  const onSavedModulesChanged = async () => { await loadModules(); loadCourse(); };

  if (loading && !course) return <AdminLoader label="Loading course content…" />;

  if (!course) {
    return (
      <div className="w-full">
        <EmptyState
          icon={BookOpen}
          title="Course not found"
          description={error || 'This course could not be loaded.'}
          action={<Button as={Link} to="/courses" icon={ArrowLeft}>Back to courses</Button>}
        />
      </div>
    );
  }

  const isPublished = course.status === 'published';

  // Publish/unpublish confirmation copy (course | module | resource).
  const pubIsLive = pubConfirm?.kind === 'course' ? pubConfirm?.item?.status === 'published' : !!pubConfirm?.item?.isPublished;
  const pubNoun = pubConfirm?.kind === 'module' ? 'module' : pubConfirm?.kind === 'lesson' ? 'resource' : 'course';

  return (
    <div className="w-full space-y-6">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8" style={{ background: GRADIENT }}>
          <BookOpen className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rotate-12 text-white/10" />
          <Link to="/courses" className="relative inline-flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> All courses
          </Link>

          <div className="relative mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Title + meta */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{course.title}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ring-1 ring-inset ring-white/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> {course.status}
                </span>
              </div>
              {course.summary ? <p className="mt-1.5 max-w-2xl text-sm text-white/80">{course.summary}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {course.level ? <HeroChip icon={GraduationCap}><span className="capitalize">{course.level}</span></HeroChip> : null}
                {course.category ? <HeroChip icon={FolderOpen}>{course.category}</HeroChip> : null}
                {tags.length ? <HeroChip icon={Tag}>{tags.length} tag{tags.length === 1 ? '' : 's'}</HeroChip> : null}
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="white" icon={isPublished ? Globe : GlobeLock} loading={statusSaving} onClick={() => setPubConfirm({ kind: 'course', item: course })}>{isPublished ? 'Unpublish' : 'Publish'}</Button>
              <Button variant="white" icon={Settings2} onClick={() => setShowCourseForm(true)}>Edit</Button>
              <Button as={Link} to={`/learn/${course._id}`} variant="white" icon={Eye} className="hidden sm:inline-flex">Preview</Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={Layers} label="Modules" value={stats.modules} />
          <HeaderStat icon={BookOpen} label="Resources" value={stats.lessons} />
          <HeaderStat icon={Globe} label="Live" value={stats.published} />
          <HeaderStat icon={Clock} label="Duration" value={stats.duration} />
        </div>
      </div>

      {/* ── Content builder ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Course content</h2>
              <p className="text-xs text-muted-foreground">
                {modules.length} module{modules.length === 1 ? '' : 's'} · drag to reorder · click a resource to preview
              </p>
            </div>
            <div className="flex items-center gap-2">
              {modules.length > 0 ? (
                <Button size="sm" variant="secondary" icon={ChevronsUpDown} onClick={toggleAll}>
                  {allExpanded ? 'Collapse all' : 'Expand all'}
                </Button>
              ) : null}
              <Button size="sm" icon={Plus} onClick={() => setModuleModal({ open: true, module: null })}>Add module</Button>
            </div>
          </div>

          {modules.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Start building your course"
              description="Add your first module (like a chapter), then upload documents, videos, links or text inside it."
              action={<Button icon={Plus} onClick={() => setModuleModal({ open: true, module: null })}>Add your first module</Button>}
            />
          ) : (
            <Reorder.Group axis="y" as="div" values={modules} onReorder={setModules} className="space-y-3">
              {modules.map((m) => (
                <ModuleCard
                  key={m._id}
                  module={m}
                  expanded={!!expanded[m._id]}
                  onToggle={() => setExpanded((p) => ({ ...p, [m._id]: !p[m._id] }))}
                  onPersistModules={persistModules}
                  onReorderLessons={reorderLessons}
                  onPersistLessons={persistLessons}
                  onAddLesson={(mod) => setLessonModal({ open: true, moduleId: mod._id, lesson: null })}
                  onEditModule={() => setModuleModal({ open: true, module: m })}
                  onDeleteModule={() => setConfirm({ kind: 'module', item: m, label: m.title })}
                  onToggleModulePublish={() => toggleModulePublish(m)}
                  lessonHandlers={lessonHandlers}
                />
              ))}
            </Reorder.Group>
          )}
      </div>

      {/* Modals */}
      <CourseFormModal open={showCourseForm} onClose={() => setShowCourseForm(false)} course={course} onSaved={loadCourse} />
      <ModuleFormModal
        open={moduleModal.open}
        onClose={() => setModuleModal({ open: false, module: null })}
        courseId={courseId}
        module={moduleModal.module}
        onSaved={onSavedModulesChanged}
      />
      <LessonFormModal
        open={lessonModal.open}
        onClose={() => setLessonModal({ open: false, moduleId: null, lesson: null })}
        moduleId={lessonModal.moduleId}
        lesson={lessonModal.lesson}
        onSaved={onSavedModulesChanged}
      />
      <LessonPreviewModal open={preview.open} onClose={() => setPreview({ open: false, lesson: null })} lesson={preview.lesson} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doDelete}
        loading={removing}
        title={confirm?.kind === 'module' ? 'Delete module?' : 'Delete resource?'}
        message={
          confirm?.kind === 'module'
            ? `"${confirm?.label}" and all the resources inside it will be permanently deleted.`
            : `"${confirm?.label}" will be permanently deleted.`
        }
      />
      <ConfirmDialog
        open={!!pubConfirm}
        onClose={() => setPubConfirm(null)}
        onConfirm={doTogglePublish}
        loading={publishing}
        tone="primary"
        title={pubIsLive ? `Unpublish ${pubNoun}?` : `Publish ${pubNoun}?`}
        message={
          pubIsLive
            ? `"${pubConfirm?.item?.title}" will be hidden from students until you publish it again.`
            : `"${pubConfirm?.item?.title}" will become visible to students.`
        }
        confirmLabel={pubIsLive ? 'Unpublish' : 'Publish'}
      />
    </div>
  );
}

export default CourseContentPage;
