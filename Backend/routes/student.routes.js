const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/student.controller');

// Admin student management (MongoDB users with the "student" role). Mounted after the global
// `authenticate` in server.js, so every route just needs the admin guard.
const router = express.Router();

router.get('/students', requireAdmin, c.listStudents);
router.post('/students', requireAdmin, c.createStudent);
router.get('/students/:id', requireAdmin, c.getStudent);
router.put('/students/:id', requireAdmin, c.updateStudent);
router.patch('/students/:id/status', requireAdmin, c.setStudentStatus);
router.post('/students/:id/password', requireAdmin, c.resetStudentPassword);
router.post('/students/:id/enrollments', requireAdmin, c.enrollStudent);
router.delete('/students/:id', requireAdmin, c.deleteStudent);

module.exports = router;
