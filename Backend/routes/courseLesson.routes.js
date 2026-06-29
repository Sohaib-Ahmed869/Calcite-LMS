const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadLessonFile } = require('../middleware/upload');
const c = require('../controllers/courseLesson.controller');

const router = express.Router();

// Admin — create (multipart "file" OR JSON link/text) + reorder (static, before /:lessonId)
router.post('/course-lessons', requireAdmin, uploadLessonFile, c.createLesson);
router.patch('/course-lessons/reorder', requireAdmin, c.reorderLessons);

// Shared list (admin = all; student = published, enrolment enforced in controller)
router.get('/course-lessons/module/:moduleId', c.listLessonsByModule);

// Shared — signed playback URL (admin or enrolled student)
router.get('/course-lessons/:lessonId/url', c.getLessonUrl);

// Admin — publish toggle + update/delete
router.patch('/course-lessons/:lessonId/publish', requireAdmin, c.publishLesson);
router.put('/course-lessons/:lessonId', requireAdmin, uploadLessonFile, c.updateLesson);
router.delete('/course-lessons/:lessonId', requireAdmin, c.deleteLesson);

module.exports = router;
