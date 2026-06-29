const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/courseEnrollment.controller');

const router = express.Router();

// Admin only
router.get('/enrollments', requireAdmin, c.listAllEnrollments); // global list across all courses
router.post('/courses/:courseId/enrollments', requireAdmin, c.enrollStudents);
router.get('/courses/:courseId/enrollments', requireAdmin, c.listEnrollments);
router.patch('/course-enrollments/:id', requireAdmin, c.updateEnrollment);
router.delete('/course-enrollments/:id', requireAdmin, c.deleteEnrollment);

module.exports = router;
