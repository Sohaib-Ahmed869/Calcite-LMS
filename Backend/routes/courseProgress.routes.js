const express = require('express');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/courseProgress.controller');

const router = express.Router();

// Student (enrolment enforced in controller)
router.post('/course-lessons/:lessonId/progress', c.updateProgress);
router.patch('/course-lessons/:lessonId/complete', c.completeLesson);
router.get('/courses/:courseId/progress', c.getCourseProgress);

module.exports = router;
