const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/courseModule.controller');

const router = express.Router();

// Shared list (admin = all; student = published, enrolment enforced in controller)
router.get('/course-modules/course/:courseId', c.listModulesByCourse);

// Admin
router.post('/courses/:courseId/modules', requireAdmin, c.createModule);
router.patch('/course-modules/reorder', requireAdmin, c.reorderModules); // before /:moduleId
router.put('/course-modules/:moduleId', requireAdmin, c.updateModule);
router.delete('/course-modules/:moduleId', requireAdmin, c.deleteModule);

module.exports = router;
