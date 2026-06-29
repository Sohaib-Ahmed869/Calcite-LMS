const Course = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const CourseLesson = require('../models/CourseLesson');
const CourseLessonProgress = require('../models/CourseLessonProgress');
const CourseNote = require('../models/CourseNote');
const CourseBookmark = require('../models/CourseBookmark');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { isAdmin } = require('../middleware/auth');
const { getAccessEnrollment } = require('../utils/courseAccess');
const { getSignedUrl, deleteFileFromS3 } = require('../middleware/upload');
const progress = require('../services/courseProgress.service');

const CONTENT_TYPES = ['video', 'pdf', 'document', 'presentation', 'audio', 'image', 'link', 'text'];

function inferContentType(mime) {
  if (!mime) return 'document';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'presentation';
  return 'document';
}

// POST /api/course-lessons (admin) — multipart upload (field "file") OR JSON (link/text).
const createLesson = wrap(async (req, res) => {
  const { moduleId, title, description, externalUrl, textContent, isPreview } = req.body || {};
  if (!isValidId(moduleId)) return fail(res, 400, 'Valid moduleId is required');
  if (!title || !title.trim()) return fail(res, 400, 'Lesson title is required');

  const module = await CourseModule.findById(moduleId);
  if (!module) return fail(res, 404, 'Module not found');
  const courseId = module.courseId; // derive from the module — the source of truth

  // Server-controlled ordering within the module.
  const last = await CourseLesson.findOne({ moduleId }).sort('-displayOrder').select('displayOrder');
  const displayOrder = (last?.displayOrder ?? -1) + 1;

  const doc = {
    courseId,
    moduleId,
    title: title.trim(),
    description,
    displayOrder,
    isPreview: isPreview !== undefined ? !!isPreview : false,
    isPublished: req.body.isPublished !== undefined ? !!req.body.isPublished : true,
    uploadedBy: req.userId,
  };

  let contentType = CONTENT_TYPES.includes(req.body.contentType) ? req.body.contentType : null;

  if (req.file) {
    doc.fileUrl = req.file.location;
    doc.fileKey = req.file.key;
    doc.fileName = req.file.originalname;
    doc.fileSize = req.file.size;
    doc.mimeType = req.file.contentType || req.file.mimetype;
    contentType = contentType || inferContentType(doc.mimeType);
  } else if (externalUrl && externalUrl.trim()) {
    doc.externalUrl = externalUrl.trim();
    contentType = contentType || (/(youtube|youtu\.be|vimeo)/i.test(externalUrl) ? 'video' : 'link');
  } else if (textContent && textContent.trim()) {
    doc.textContent = textContent;
    contentType = contentType || 'text';
  } else {
    return fail(res, 400, 'A lesson needs an uploaded file, an external URL, or text content');
  }

  if (req.body.duration !== undefined) doc.duration = Number(req.body.duration) || 0;
  doc.contentType = contentType || 'document';

  const lesson = await CourseLesson.create(doc);
  // A new (published) lesson changes totals + everyone's progress %.
  await progress.recomputeAllEnrollmentsForCourse(courseId);
  return ok(res, lesson, 201);
});

// PUT /api/course-lessons/:lessonId (admin) — optional new file replaces the old.
const updateLesson = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');

  const wasPublished = lesson.isPublished;

  for (const f of ['title', 'description', 'externalUrl', 'textContent']) {
    if (req.body[f] !== undefined) lesson[f] = req.body[f];
  }
  if (req.body.contentType !== undefined && CONTENT_TYPES.includes(req.body.contentType)) lesson.contentType = req.body.contentType;
  if (req.body.duration !== undefined) lesson.duration = Number(req.body.duration) || 0;
  if (req.body.isPreview !== undefined) lesson.isPreview = !!req.body.isPreview;
  if (req.body.isPublished !== undefined) lesson.isPublished = !!req.body.isPublished;

  if (req.file) {
    const oldKey = lesson.fileKey;
    lesson.fileUrl = req.file.location;
    lesson.fileKey = req.file.key;
    lesson.fileName = req.file.originalname;
    lesson.fileSize = req.file.size;
    lesson.mimeType = req.file.contentType || req.file.mimetype;
    if (!req.body.contentType) lesson.contentType = inferContentType(lesson.mimeType);
    if (oldKey) deleteFileFromS3(oldKey).catch(() => {});
  }

  await lesson.save();
  if (wasPublished !== lesson.isPublished) await progress.recomputeAllEnrollmentsForCourse(lesson.courseId);
  return ok(res, lesson);
});

// DELETE /api/course-lessons/:lessonId (admin)
const deleteLesson = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');

  if (lesson.fileKey) deleteFileFromS3(lesson.fileKey).catch(() => {});
  await Promise.all([
    CourseLessonProgress.deleteMany({ lessonId }),
    CourseNote.deleteMany({ lessonId }),
    CourseBookmark.deleteMany({ lessonId }),
  ]);
  const courseId = lesson.courseId;
  await lesson.deleteOne();

  await progress.recomputeAllEnrollmentsForCourse(courseId);
  return ok(res, { deleted: true });
});

// PATCH /api/course-lessons/reorder (admin) — body { moduleId, lessonIds: [orderedIds] }
const reorderLessons = wrap(async (req, res) => {
  const { moduleId, lessonIds } = req.body || {};
  if (!isValidId(moduleId)) return fail(res, 400, 'Invalid module id');
  if (!Array.isArray(lessonIds) || !lessonIds.length) return fail(res, 400, 'lessonIds array is required');

  await Promise.all(
    lessonIds.map((id, index) =>
      isValidId(id) ? CourseLesson.updateOne({ _id: id, moduleId }, { displayOrder: index }) : null,
    ),
  );
  const lessons = await CourseLesson.find({ moduleId }).sort('displayOrder');
  return ok(res, lessons);
});

// PATCH /api/course-lessons/:lessonId/publish (admin) — set/toggle isPublished.
const publishLesson = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');

  lesson.isPublished = req.body.isPublished !== undefined ? !!req.body.isPublished : !lesson.isPublished;
  await lesson.save();
  await progress.recomputeAllEnrollmentsForCourse(lesson.courseId);
  return ok(res, lesson);
});

// GET /api/course-lessons/module/:moduleId — admin: all; student: published only (enrolment enforced).
const listLessonsByModule = wrap(async (req, res) => {
  const { moduleId } = req.params;
  if (!isValidId(moduleId)) return fail(res, 400, 'Invalid module id');
  const module = await CourseModule.findById(moduleId);
  if (!module) return fail(res, 404, 'Module not found');

  if (isAdmin(req)) {
    const lessons = await CourseLesson.find({ moduleId }).sort('displayOrder');
    return ok(res, lessons);
  }

  const course = await Course.findById(module.courseId);
  const enrollment = await getAccessEnrollment(req.userId, module.courseId);
  if (!course || course.status !== 'published' || !enrollment || !module.isPublished) {
    return fail(res, 403, 'You are not enrolled in this course');
  }
  // Hide file storage keys from students; they fetch playable URLs via /url.
  const lessons = await CourseLesson.find({ moduleId, isPublished: true }).sort('displayOrder').select('-fileKey');
  return ok(res, lessons);
});

// GET /api/course-lessons/:lessonId/url — signed S3 URL (uploads) or the external URL.
const getLessonUrl = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');

  if (!isAdmin(req)) {
    const course = await Course.findById(lesson.courseId);
    const enrollment = await getAccessEnrollment(req.userId, lesson.courseId);
    const module = await CourseModule.findById(lesson.moduleId);
    if (!course || course.status !== 'published' || !enrollment || !lesson.isPublished || !module?.isPublished) {
      return fail(res, 403, 'You are not enrolled in this course');
    }
  }

  if (lesson.externalUrl) return ok(res, { url: lesson.externalUrl, kind: 'external', contentType: lesson.contentType });
  if (lesson.fileKey) {
    const url = await getSignedUrl(lesson.fileKey, 3600);
    if (!url) return fail(res, 502, 'Could not generate file URL');
    return ok(res, { url, kind: 'file', contentType: lesson.contentType, fileName: lesson.fileName });
  }
  if (lesson.textContent) return ok(res, { url: null, kind: 'text', contentType: 'text', textContent: lesson.textContent });
  return fail(res, 404, 'This lesson has no playable content');
});

module.exports = {
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  publishLesson,
  listLessonsByModule,
  getLessonUrl,
};
