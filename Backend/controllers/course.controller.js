const Course = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const CourseLesson = require('../models/CourseLesson');
const CourseEnrollment = require('../models/CourseEnrollment');
const CourseLessonProgress = require('../models/CourseLessonProgress');
const CourseNote = require('../models/CourseNote');
const CourseBookmark = require('../models/CourseBookmark');
const CourseReview = require('../models/CourseReview');
const CourseCertificate = require('../models/CourseCertificate');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { isAdmin } = require('../middleware/auth');
const { getAccessEnrollment } = require('../utils/courseAccess');
const { deleteFileFromS3, getSignedUrl: signS3Url } = require('../middleware/upload');
const progress = require('../services/courseProgress.service');

// Accept tags as an array, a JSON string, or a comma-separated string (multipart sends strings).
function parseTags(input) {
  if (Array.isArray(input)) return input.map((t) => String(t).trim()).filter(Boolean);
  if (typeof input === 'string' && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      return input.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return undefined;
}

// The cover lives in a private S3 bucket, so the stored raw URL 403s in the browser. Swap in a
// short-lived presigned GET URL generated from the saved key. Mutates + returns the plain object;
// no-op when the course has no cover. (Same pattern lessons already use for their files.)
async function signCover(course) {
  if (course && course.coverImageKey) {
    const url = await signS3Url(course.coverImageKey, 24 * 3600);
    if (url) course.coverImageUrl = url;
  }
  return course;
}

// Attach averageRating / reviewCount / enrollmentCount to a list of plain course objects.
async function decorate(courses) {
  const ids = courses.map((c) => c._id);
  if (!ids.length) return courses;
  const [ratings, enrolls] = await Promise.all([
    CourseReview.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    CourseEnrollment.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: '$courseId', count: { $sum: 1 } } }]),
  ]);
  const rMap = new Map(ratings.map((r) => [String(r._id), r]));
  const eMap = new Map(enrolls.map((e) => [String(e._id), e.count]));
  const decorated = courses.map((c) => {
    const r = rMap.get(String(c._id));
    return {
      ...c,
      averageRating: r ? Math.round(r.avg * 10) / 10 : 0,
      reviewCount: r ? r.count : 0,
      enrollmentCount: eMap.get(String(c._id)) || 0,
    };
  });
  await Promise.all(decorated.map(signCover)); // presign covers (local op, no S3 round-trip)
  return decorated;
}

// POST /api/courses (admin) — create. Optional multipart cover image (field "coverImage").
const createCourse = wrap(async (req, res) => {
  const { title, description, summary, category, level, status } = req.body || {};
  if (!title || !title.trim()) return fail(res, 400, 'Title is required');

  // Server-controlled ordering — never trust the client.
  const last = await Course.findOne().sort('-displayOrder').select('displayOrder');
  const displayOrder = (last?.displayOrder ?? -1) + 1;

  const doc = {
    title: title.trim(),
    description,
    summary,
    category,
    level: ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner',
    status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
    displayOrder,
    createdBy: req.userId,
  };
  const tags = parseTags(req.body.tags);
  if (tags) doc.tags = tags;
  if (doc.status === 'published') doc.publishedAt = new Date();
  if (req.file) {
    doc.coverImageUrl = req.file.location;
    doc.coverImageKey = req.file.key;
  }

  const course = await Course.create(doc);
  return ok(res, await signCover(course.toObject()), 201);
});

// GET /api/courses (admin) — list + search + status filter.
const listCourses = wrap(async (req, res) => {
  const { search, status } = req.query;
  const filter = { isActive: true };
  if (status && ['draft', 'published', 'archived'].includes(status)) filter.status = status;
  if (search && search.trim()) filter.title = { $regex: search.trim(), $options: 'i' };

  const courses = await Course.find(filter).sort({ displayOrder: 1, createdAt: -1 }).lean();
  return ok(res, await decorate(courses));
});

// GET /api/courses/my (student) — enrolled courses + my progress.
const getMyCourses = wrap(async (req, res) => {
  const enrollments = await CourseEnrollment.find({ studentId: req.userId, status: { $in: ['active', 'completed'] } })
    .populate({ path: 'courseId', match: { status: 'published', isActive: true } })
    .sort('-lastAccessedAt')
    .lean();

  const data = enrollments
    .filter((e) => e.courseId) // drop enrolments whose course is no longer published
    .map((e) => ({
      enrollmentId: e._id,
      status: e.status,
      progressPercent: e.progressPercent,
      completedLessons: e.completedLessons,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      course: e.courseId,
    }));
  await Promise.all(data.map((d) => signCover(d.course)));
  return ok(res, data);
});

// GET /api/courses/:courseId — admin: any course; student: only if published + enrolled (else 403).
const getCourse = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');

  const course = await Course.findById(courseId).lean();
  if (!course || course.isActive === false) return fail(res, 404, 'Course not found');

  if (isAdmin(req)) {
    const [decorated] = await decorate([course]);
    const moduleCount = await CourseModule.countDocuments({ courseId });
    const lessonCount = await CourseLesson.countDocuments({ courseId });
    return ok(res, { ...decorated, moduleCount, lessonCount });
  }

  // Student: must be enrolled and the course must be published.
  const enrollment = await getAccessEnrollment(req.userId, courseId);
  if (!enrollment || course.status !== 'published') return fail(res, 403, 'You are not enrolled in this course');

  // Touch lastAccessedAt (fire-and-forget).
  CourseEnrollment.updateOne({ _id: enrollment._id }, { lastAccessedAt: new Date() }).catch(() => {});
  const [decorated] = await decorate([course]);
  return ok(res, { ...decorated, enrollment: { status: enrollment.status, progressPercent: enrollment.progressPercent, completedLessons: enrollment.completedLessons } });
});

// PUT /api/courses/:courseId (admin). Optional new cover image.
const updateCourse = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const course = await Course.findById(courseId);
  if (!course || course.isActive === false) return fail(res, 404, 'Course not found');

  const fields = ['title', 'description', 'summary', 'category', 'level'];
  for (const f of fields) if (req.body[f] !== undefined) course[f] = req.body[f];
  const tags = parseTags(req.body.tags);
  if (tags) course.tags = tags;

  if (req.file) {
    const oldKey = course.coverImageKey;
    course.coverImageUrl = req.file.location;
    course.coverImageKey = req.file.key;
    if (oldKey) deleteFileFromS3(oldKey).catch(() => {});
  }

  await course.save();
  return ok(res, await signCover(course.toObject()));
});

// DELETE /api/courses/:courseId (admin) — hard delete + cascade (docs and S3 files).
const deleteCourse = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const course = await Course.findById(courseId);
  if (!course) return fail(res, 404, 'Course not found');

  // Collect S3 keys (cover + lesson files + certificate PDFs) and delete best-effort.
  const lessons = await CourseLesson.find({ courseId }).select('fileKey');
  const certs = await CourseCertificate.find({ courseId }).select('certificateUrl');
  const keys = [course.coverImageKey, ...lessons.map((l) => l.fileKey), ...certs.map((c) => c.certificateUrl)].filter(Boolean);
  await Promise.all(keys.map((k) => deleteFileFromS3(k).catch(() => {})));

  await Promise.all([
    CourseModule.deleteMany({ courseId }),
    CourseLesson.deleteMany({ courseId }),
    CourseEnrollment.deleteMany({ courseId }),
    CourseLessonProgress.deleteMany({ courseId }),
    CourseNote.deleteMany({ courseId }),
    CourseBookmark.deleteMany({ courseId }),
    CourseReview.deleteMany({ courseId }),
    CourseCertificate.deleteMany({ courseId }),
  ]);
  await course.deleteOne();
  return ok(res, { deleted: true });
});

// PATCH /api/courses/:courseId/publish (admin) — set status (or toggle draft↔published).
const publishCourse = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const course = await Course.findById(courseId);
  if (!course || course.isActive === false) return fail(res, 404, 'Course not found');

  let next = req.body?.status;
  if (next && !['draft', 'published', 'archived'].includes(next)) return fail(res, 400, 'Invalid status');
  if (!next) next = course.status === 'published' ? 'draft' : 'published';

  course.status = next;
  if (next === 'published' && !course.publishedAt) course.publishedAt = new Date();
  await course.save();

  // Keep totalLessons fresh on publish.
  await progress.recomputeCourseTotals(courseId);
  return ok(res, await signCover(course.toObject()));
});

module.exports = {
  createCourse,
  listCourses,
  getMyCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
};
