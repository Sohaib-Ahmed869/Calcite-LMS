const CourseLesson = require('../models/CourseLesson');
const CourseNote = require('../models/CourseNote');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { requireStudentCourseAccess } = require('../utils/courseAccess');

// GET /api/course-lessons/:lessonId/notes (student) — my notes on this lesson.
const listNotes = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');
  await requireStudentCourseAccess(req.userId, lesson.courseId);

  const notes = await CourseNote.find({ studentId: req.userId, lessonId }).sort('timestamp createdAt');
  return ok(res, notes);
});

// POST /api/course-lessons/:lessonId/notes (student) — { noteText, timestamp }
const createNote = wrap(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return fail(res, 400, 'Invalid lesson id');
  const lesson = await CourseLesson.findById(lessonId);
  if (!lesson) return fail(res, 404, 'Lesson not found');
  await requireStudentCourseAccess(req.userId, lesson.courseId);

  const { noteText, timestamp } = req.body || {};
  if (!noteText || !noteText.trim()) return fail(res, 400, 'noteText is required');

  const note = await CourseNote.create({
    studentId: req.userId,
    courseId: lesson.courseId,
    lessonId,
    noteText: noteText.trim(),
    timestamp: timestamp === undefined || timestamp === null ? null : Number(timestamp),
  });
  return ok(res, note, 201);
});

// PUT /api/course-notes/:id (student, owner only)
const updateNote = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid note id');
  const note = await CourseNote.findById(id);
  if (!note) return fail(res, 404, 'Note not found');
  if (String(note.studentId) !== String(req.userId)) return fail(res, 403, 'Not your note');

  if (req.body.noteText !== undefined) note.noteText = req.body.noteText;
  if (req.body.timestamp !== undefined) note.timestamp = req.body.timestamp === null ? null : Number(req.body.timestamp);
  await note.save();
  return ok(res, note);
});

// DELETE /api/course-notes/:id (student, owner only)
const deleteNote = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid note id');
  const note = await CourseNote.findById(id);
  if (!note) return fail(res, 404, 'Note not found');
  if (String(note.studentId) !== String(req.userId)) return fail(res, 403, 'Not your note');
  await note.deleteOne();
  return ok(res, { deleted: true });
});

module.exports = { listNotes, createNote, updateNote, deleteNote };
