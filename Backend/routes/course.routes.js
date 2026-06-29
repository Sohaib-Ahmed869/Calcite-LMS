const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadCourseCover } = require('../middleware/upload');
const c = require('../controllers/course.controller');

const router = express.Router();

// Student
router.get('/courses/my', c.getMyCourses); // before /courses/:courseId

// Admin
router.post('/courses', requireAdmin, uploadCourseCover, c.createCourse);
router.get('/courses', requireAdmin, c.listCourses);
router.put('/courses/:courseId', requireAdmin, uploadCourseCover, c.updateCourse);
router.delete('/courses/:courseId', requireAdmin, c.deleteCourse);
router.patch('/courses/:courseId/publish', requireAdmin, c.publishCourse);

// Shared (admin = any; student = enrolled + published, enforced in controller)
router.get('/courses/:courseId', c.getCourse);

module.exports = router;
