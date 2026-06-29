const CourseLesson = require('../models/CourseLesson');
const CourseLessonProgress = require('../models/CourseLessonProgress');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { requireStudentCourseAccess } = require('../utils/courseAccess');
const progress = require('../services/courseProgress.service');

// POST /api/course-lessons/:lessonId/progress (student) — save resume position / time spent.
const updateProgress = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');
  await requireStudentCourseAccess(req.userId, lesson.courseId); // throws 403/404 if not allowed

  const now = new Date();
  const set = { courseId: lesson.courseId, lastViewedAt: now };
  if (req.body.lastViewedPosition !== undefined) set.lastViewedPosition = Number(req.body.lastViewedPosition) || 0;
  if (req.body.progressSeconds !== undefined) set.progressSeconds = Number(req.body.progressSeconds) || 0;

  const update = { $set: set, $setOnInsert: { firstViewedAt: now } };
  const inc = {};
  if (req.body.timeSpentDelta !== undefined) inc.timeSpentSeconds = Number(req.body.timeSpentDelta) || 0;
  if (req.body.countView) inc.viewCount = 1;
  if (Object.keys(inc).length) update.$inc = inc;

  const record = await CourseLessonProgress.findOneAndUpdate({ studentId: req.userId, lessonId }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  return ok(res, record);
});

// PATCH /api/course-lessons/:lessonId/complete (student) — mark (un)complete → recompute + maybe certify.
const completeLesson = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');
  await requireStudentCourseAccess(req.userId, lesson.courseId);

  const isCompleted = req.body.isCompleted !== false; // default true
  const now = new Date();
  const record = await CourseLessonProgress.findOneAndUpdate(
    { studentId: req.userId, lessonId },
    { $set: { courseId: lesson.courseId, isCompleted, completedAt: isCompleted ? now : null, lastViewedAt: now }, $setOnInsert: { firstViewedAt: now } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const enrollment = await progress.recomputeEnrollmentProgress({ courseId: lesson.courseId, studentId: req.userId });
  return ok(res, { progress: record, enrollment });
});

// GET /api/courses/:courseId/progress (student) — my per-lesson progress + overall.
const getCourseProgress = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const { enrollment } = await requireStudentCourseAccess(req.userId, courseId);

  const lessons = await CourseLessonProgress.find({ studentId: req.userId, courseId }).lean();
  return ok(res, {
    overall: {
      progressPercent: enrollment.progressPercent,
      completedLessons: enrollment.completedLessons,
      status: enrollment.status,
      completedAt: enrollment.completedAt,
    },
    lessons,
  });
});

module.exports = { updateProgress, completeLesson, getCourseProgress };
