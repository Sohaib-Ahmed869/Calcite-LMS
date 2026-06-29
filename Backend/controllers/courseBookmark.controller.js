const CourseLesson = require('../models/CourseLesson');
const CourseBookmark = require('../models/CourseBookmark');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { requireStudentCourseAccess } = require('../utils/courseAccess');

// GET /api/course-lessons/:lessonId/bookmarks (student) — my bookmarks on this lesson.
const listBookmarks = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');
  await requireStudentCourseAccess(req.userId, lesson.courseId);

  const bookmarks = await CourseBookmark.find({ studentId: req.userId, lessonId }).sort('timestamp createdAt');
  return ok(res, bookmarks);
});

// POST /api/course-lessons/:lessonId/bookmarks (student) — { title, timestamp }
const createBookmark = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');
  await requireStudentCourseAccess(req.userId, lesson.courseId);

  const { title, timestamp } = req.body || {};
  if (!title || !title.trim()) return fail(res, 400, 'Bookmark title is required');

  const bookmark = await CourseBookmark.create({
    studentId: req.userId,
    courseId: lesson.courseId,
    lessonId,
    title: title.trim(),
    timestamp: timestamp === undefined || timestamp === null ? 0 : Number(timestamp),
  });
  return ok(res, bookmark, 201);
});

// DELETE /api/course-bookmarks/:id (student, owner only)
const deleteBookmark = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid bookmark id');
  const bookmark = await CourseBookmark.findById(id);
  if (!bookmark) return fail(res, 404, 'Bookmark not found');
  if (String(bookmark.studentId) !== String(req.userId)) return fail(res, 403, 'Not your bookmark');
  await bookmark.deleteOne();
  return ok(res, { deleted: true });
});

module.exports = { listBookmarks, createBookmark, deleteBookmark };
