const express = require('express');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/courseReview.controller');

const router = express.Router();

// Shared list (admin = all; student = enrolled) + student upsert + helpful toggle
router.get('/courses/:courseId/reviews', c.listReviews);
router.post('/courses/:courseId/reviews', c.upsertReview);
router.patch('/course-reviews/:id/helpful', c.toggleHelpful);

module.exports = router;
