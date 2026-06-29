const Course = require('../models/Course');
const CourseReview = require('../models/CourseReview');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { isAdmin } = require('../middleware/auth');
const { getAccessEnrollment } = require('../utils/courseAccess');

// GET /api/courses/:courseId/reviews — admin: see all ratings; student: must be enrolled.
const listReviews = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const course = await Course.findById(courseId);
  if (!course) return fail(res, 404, 'Course not found');

  if (!isAdmin(req)) {
    const enrollment = await getAccessEnrollment(req.userId, courseId);
    if (!enrollment) return fail(res, 403, 'You are not enrolled in this course');
  }

  const reviews = await CourseReview.find({ courseId }).populate('studentId', 'firstName lastName').sort('-createdAt').lean();
  const count = reviews.length;
  const averageRating = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  const data = reviews.map((r) => ({
    _id: r._id,
    student: r.studentId,
    rating: r.rating,
    reviewText: r.reviewText,
    helpfulCount: (r.helpful || []).length,
    markedHelpful: (r.helpful || []).some((u) => String(u) === String(req.userId)),
    createdAt: r.createdAt,
  }));
  return ok(res, { reviews: data, averageRating, count });
});

// POST /api/courses/:courseId/reviews (student) — upsert my review. { rating, reviewText }
const upsertReview = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const enrollment = await getAccessEnrollment(req.userId, courseId);
  if (!enrollment) return fail(res, 403, 'You must be enrolled to review this course');

  const rating = Number(req.body.rating);
  if (!rating || rating < 1 || rating > 5) return fail(res, 400, 'Rating must be between 1 and 5');

  const review = await CourseReview.findOneAndUpdate(
    { studentId: req.userId, courseId },
    { $set: { rating, reviewText: req.body.reviewText || '' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return ok(res, review, 201);
});

// PATCH /api/course-reviews/:id/helpful (student) — toggle my "helpful" mark.
const toggleHelpful = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid review id');
  const review = await CourseReview.findById(id);
  if (!review) return fail(res, 404, 'Review not found');

  const uid = String(req.userId);
  const has = review.helpful.some((u) => String(u) === uid);
  if (has) review.helpful = review.helpful.filter((u) => String(u) !== uid);
  else review.helpful.push(req.userId);
  await review.save();
  return ok(res, { helpfulCount: review.helpful.length, markedHelpful: !has });
});

module.exports = { listReviews, upsertReview, toggleHelpful };
