import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Layers,
  BookOpen,
  Clock,
  Globe,
  Pencil,
  Trash2,
  Eye,
  Settings2,
  Sparkles,
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
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
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
      <Button size="iconSm" variant="ghost" icon={Eye} onClick={onPreview} title="Preview" />
      <Button size="iconSm" variant="ghost" icon={Pencil} onClick={onEdit} title="Edit" />
      <button type="button" onClick={onTogglePublish} className={cn('hidden rounded-md px-2 py-1 text-[11px] font-semibold transition-colors sm:inline-block', lesson.isPublished ? 'text-muted-foreground hover:text-foreground' : 'text-accent')}>
        {lesson.isPublished ? 'Unpublish' : 'Publish'}
      </button>
      <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={onDelete} title="Delete" />
    </Reorder.Item>
  );
}

/* ── Module card ─────────────────────────────────────────────────────────────── */
function ModuleCard({ module, expanded, onToggle, onPersistModules, onReorderLessons, onPersistLessons, onAddLesson, onEditModule, onDeleteModule, onToggleModulePublish, lessonHandlers }) {
  const controls = useDragControls();
  const lessons = module.lessons || [];
  const dur = formatDuration(lessons.reduce((s, l) => s + (l.duration || 0), 0));

  return (
    <Reorder.Item
      value={module}
      as="div"
      dragListener={false}
      dragControls={controls}
      onDragEnd={onPersistModules}
      whileDrag={{ scale: 1.005, boxShadow: 'var(--card-shadow)' }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
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
            {lessons.length} resource{lessons.length === 1 ? '' : 's'}{dur ? ` · ${dur}` : ''}
          </p>
        </button>
        <Badge tone={module.isPublished ? 'success' : 'warning'}>{module.isPublished ? 'Published' : 'Draft'}</Badge>
        <Button size="iconSm" variant="ghost" icon={Globe} onClick={onToggleModulePublish} title={module.isPublished ? 'Unpublish module' : 'Publish module'} />
        <Button size="iconSm" variant="ghost" icon={Pencil} onClick={onEditModule} title="Edit module" />
        <Button size="iconSm" variant="dangerGhost" icon={Trash2} onClick={onDeleteModule} title="Delete module" />
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="overflow-hidden">
            <div className="space-y-2 border-t border-border bg-muted/30 px-3 py-3">
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
                      onTogglePublish={() => lessonHandlers.togglePublish(l)}
                    />
                  ))}
                </Reorder.Group>
              )}
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => onAddLesson(module)} className="w-full">Add resource</Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Reorder.Item>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────────── */
export function CourseContentPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  // Modal / dialog state
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [moduleModal, setModuleModal] = useState({ open: false, module: null });
  const [lessonModal, setLessonModal] = useState({ open: false, moduleId: null, lesson: null });
  const [preview, setPreview] = useState({ open: false, lesson: null });
  const [confirm, setConfirm] = useState(null); // { kind:'module'|'lesson', item, label }
  const [removing, setRemoving] = useState(false);

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

  const stats = useMemo(() => {
    const lessons = modules.flatMap((m) => m.lessons || []);
    return {
      modules: modules.length,
      lessons: lessons.length,
      published: lessons.filter((l) => l.isPublished).length,
      duration: formatDuration(lessons.reduce((s, l) => s + (l.duration || 0), 0)) || '—',
    };
  }, [modules]);

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

  const onSavedModulesChanged = async () => { await loadModules(); loadCourse(); };

  if (loading) return <AdminLoader label="Loading course content…" />;

  if (error || !course) {
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

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="px-6 py-6 sm:px-8" style={{ background: GRADIENT }}>
          <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> All courses
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{course.title}</h1>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">{course.status}</span>
              </div>
              {course.summary ? <p className="mt-1 max-w-xl text-sm text-white/80">{course.summary}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="white" icon={Settings2} onClick={() => setShowCourseForm(true)}>Edit</Button>
              <Button as={Link} to={`/learn/${course._id}`} variant="white" icon={Eye}>Preview as student</Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={Layers} label="Modules" value={stats.modules} />
          <HeaderStat icon={BookOpen} label="Resources" value={stats.lessons} />
          <HeaderStat icon={Globe} label="Published" value={stats.published} />
          <HeaderStat icon={Clock} label="Duration" value={stats.duration} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Course content</h2>
          <p className="text-xs text-muted-foreground">Drag to reorder · click a resource to preview</p>
        </div>
        <Button icon={Plus} onClick={() => setModuleModal({ open: true, module: null })}>Add module</Button>
      </div>

      {/* Modules */}
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
    </div>
  );
}

export default CourseContentPage;
