const Course = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const CourseLesson = require('../models/CourseLesson');
const CourseLessonProgress = require('../models/CourseLessonProgress');
const CourseNote = require('../models/CourseNote');
const CourseBookmark = require('../models/CourseBookmark');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { isAdmin } = require('../middleware/auth');
const { getAccessEnrollment } = require('../utils/courseAccess');
const { deleteFileFromS3 } = require('../middleware/upload');
const progress = require('../services/courseProgress.service');

// POST /api/courses/:courseId/modules (admin)
const createModule = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const course = await Course.findById(courseId);
  if (!course) return fail(res, 404, 'Course not found');

  const { title, description, isPublished } = req.body || {};
  if (!title || !title.trim()) return fail(res, 400, 'Module title is required');

  const last = await CourseModule.findOne({ courseId }).sort('-displayOrder').select('displayOrder');
  const displayOrder = (last?.displayOrder ?? -1) + 1;

  const module = await CourseModule.create({
    courseId,
    title: title.trim(),
    description,
    isPublished: isPublished !== undefined ? !!isPublished : true,
    displayOrder,
    createdBy: req.userId,
  });
  // New module may change the published-lesson set membership later; totals are lesson-driven so no
  // recompute needed here (a module with no lessons contributes nothing).
  return ok(res, module, 201);
});

// PUT /api/course-modules/:moduleId (admin)
const updateModule = wrap(async (req, res) => {
  const { moduleId } = req.params;
  if (!isValidId(moduleId)) return fail(res, 400, 'Invalid module id');
  const module = await CourseModule.findById(moduleId);
  if (!module) return fail(res, 404, 'Module not found');

  const wasPublished = module.isPublished;
  if (req.body.title !== undefined) module.title = req.body.title;
  if (req.body.description !== undefined) module.description = req.body.description;
  if (req.body.isPublished !== undefined) module.isPublished = !!req.body.isPublished;
  await module.save();

  // Toggling a module's publish state changes which lessons count toward progress.
  if (wasPublished !== module.isPublished) await progress.recomputeAllEnrollmentsForCourse(module.courseId);
  return ok(res, module);
});

// DELETE /api/course-modules/:moduleId (admin) — cascade lessons + their progress/notes/bookmarks.
const deleteModule = wrap(async (req, res) => {
  const { moduleId } = req.params;
  if (!isValidId(moduleId)) return fail(res, 400, 'Invalid module id');
  const module = await CourseModule.findById(moduleId);
  if (!module) return fail(res, 404, 'Module not found');

  const lessons = await CourseLesson.find({ moduleId }).select('_id fileKey');
  const lessonIds = lessons.map((l) => l._id);
  await Promise.all(lessons.map((l) => (l.fileKey ? deleteFileFromS3(l.fileKey).catch(() => {}) : null)));

  await Promise.all([
    CourseLesson.deleteMany({ moduleId }),
    CourseLessonProgress.deleteMany({ lessonId: { $in: lessonIds } }),
    CourseNote.deleteMany({ lessonId: { $in: lessonIds } }),
    CourseBookmark.deleteMany({ lessonId: { $in: lessonIds } }),
  ]);
  await module.deleteOne();

  await progress.recomputeAllEnrollmentsForCourse(module.courseId);
  return ok(res, { deleted: true });
});

// PATCH /api/course-modules/reorder (admin) — body { courseId, moduleIds: [orderedIds] }
const reorderModules = wrap(async (req, res) => {
  const { courseId, moduleIds } = req.body || {};
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  if (!Array.isArray(moduleIds) || !moduleIds.length) return fail(res, 400, 'moduleIds array is required');

  // Server assigns displayOrder by position — the client never sends order numbers.
  await Promise.all(
    moduleIds.map((id, index) =>
      isValidId(id) ? CourseModule.updateOne({ _id: id, courseId }, { displayOrder: index }) : null,
    ),
  );
  const modules = await CourseModule.find({ courseId }).sort('displayOrder');
  return ok(res, modules);
});

// GET /api/course-modules/course/:courseId — admin: all; student: published only (enrolment enforced).
const listModulesByCourse = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');

  if (isAdmin(req)) {
    const modules = await CourseModule.find({ courseId }).sort('displayOrder');
    return ok(res, modules);
  }

  const course = await Course.findById(courseId);
  const enrollment = await getAccessEnrollment(req.userId, courseId);
  if (!course || course.status !== 'published' || !enrollment) return fail(res, 403, 'You are not enrolled in this course');

  const modules = await CourseModule.find({ courseId, isPublished: true }).sort('displayOrder');
  return ok(res, modules);
});

module.exports = { createModule, updateModule, deleteModule, reorderModules, listModulesByCourse };
