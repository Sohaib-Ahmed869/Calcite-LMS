const express = require('express');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/courseBookmark.controller');

const router = express.Router();

// Student (owner-scoped; enrolment enforced in controller)
router.get('/course-lessons/:lessonId/bookmarks', c.listBookmarks);
router.post('/course-lessons/:lessonId/bookmarks', c.createBookmark);
router.delete('/course-bookmarks/:id', c.deleteBookmark);

module.exports = router;
