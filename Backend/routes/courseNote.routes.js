const express = require('express');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/courseNote.controller');

const router = express.Router();

// Student (owner-scoped; enrolment enforced in controller)
router.get('/course-lessons/:lessonId/notes', c.listNotes);
router.post('/course-lessons/:lessonId/notes', c.createNote);
router.put('/course-notes/:id', c.updateNote);
router.delete('/course-notes/:id', c.deleteNote);

module.exports = router;
