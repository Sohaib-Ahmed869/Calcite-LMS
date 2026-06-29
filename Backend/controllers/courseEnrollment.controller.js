const Course = require('../models/Course');
const CourseEnrollment = require('../models/CourseEnrollment');
const CourseCertificate = require('../models/CourseCertificate');
const User = require('../models/User');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const progress = require('../services/courseProgress.service');
const { getSignedUrl: signS3Url } = require('../middleware/upload');

// POST /api/courses/:courseId/enrollments (admin) — enrol one or many students.
// Body: { studentId } or { studentIds: [ids] }
const enrollStudents = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const course = await Course.findById(courseId);
  if (!course) return fail(res, 404, 'Course not found');

  let ids = req.body.studentIds || (req.body.studentId ? [req.body.studentId] : []);
  ids = [...new Set((ids || []).filter(isValidId).map(String))];
  if (!ids.length) return fail(res, 400, 'Provide studentId or studentIds');

  // Only enrol real users.
  const users = await User.find({ _id: { $in: ids } }).select('_id');
  const validIds = users.map((u) => String(u._id));

  const results = [];
  for (const sid of validIds) {
    let e = await CourseEnrollment.findOne({ courseId, studentId: sid });
    if (e) {
      if (['withdrawn', 'suspended'].includes(e.status)) {
        e.status = 'active';
        await e.save();
        await progress.recomputeEnrollmentProgress({ courseId, studentId: sid });
        results.push({ studentId: sid, status: 'reactivated' });
      } else {
        results.push({ studentId: sid, status: 'already_enrolled' });
      }
    } else {
      await CourseEnrollment.create({ courseId, studentId: sid, enrolledBy: req.userId });
      await progress.recomputeEnrollmentProgress({ courseId, studentId: sid });
      results.push({ studentId: sid, status: 'enrolled' });
    }
  }

  const skipped = ids.filter((id) => !validIds.includes(id));
  return ok(res, { results, enrolled: results.filter((r) => r.status === 'enrolled').length, skippedInvalidUsers: skipped }, 201);
});

// GET /api/courses/:courseId/enrollments (admin) — each student's progress + certificate status.
const listEnrollments = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');

  const enrollments = await CourseEnrollment.find({ courseId })
    .populate('studentId', 'firstName lastName email')
    .sort('-createdAt')
    .lean();

  const certs = await CourseCertificate.find({ courseId }).select('studentId certificateNumber');
  const certMap = new Map(certs.map((c) => [String(c.studentId), c.certificateNumber]));

  const data = enrollments.map((e) => {
    const sid = String(e.studentId?._id || e.studentId);
    return {
      _id: e._id,
      student: e.studentId,
      status: e.status,
      progressPercent: e.progressPercent,
      completedLessons: e.completedLessons,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      lastAccessedAt: e.lastAccessedAt,
      hasCertificate: certMap.has(sid),
      certificateNumber: certMap.get(sid) || null,
    };
  });
  return ok(res, data);
});

// PATCH /api/course-enrollments/:id (admin) — change status (active/suspended/withdrawn/completed).
const updateEnrollment = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid enrolment id');
  const enrollment = await CourseEnrollment.findById(id);
  if (!enrollment) return fail(res, 404, 'Enrolment not found');

  const { status } = req.body || {};
  if (status && !['active', 'suspended', 'withdrawn', 'completed'].includes(status)) return fail(res, 400, 'Invalid status');
  if (status) enrollment.status = status;
  await enrollment.save();
  return ok(res, enrollment);
});

// DELETE /api/course-enrollments/:id (admin) — remove enrolment (revokes access).
const deleteEnrollment = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid enrolment id');
  const enrollment = await CourseEnrollment.findById(id);
  if (!enrollment) return fail(res, 404, 'Enrolment not found');
  await enrollment.deleteOne();
  return ok(res, { deleted: true });
});

// GET /api/enrollments (admin) — every enrolment across all courses, filterable.
// Query: courseId, studentId, status, search (matches student name/email or course title).
const listAllEnrollments = wrap(async (req, res) => {
  const { courseId, studentId, status, search } = req.query;
  const filter = {};
  if (isValidId(courseId)) filter.courseId = courseId;
  if (isValidId(studentId)) filter.studentId = studentId;
  if (status && ['active', 'completed', 'suspended', 'withdrawn'].includes(status)) filter.status = status;

  let enrollments = await CourseEnrollment.find(filter)
    .populate('studentId', 'firstName lastName email isActive')
    .populate('courseId', 'title status level coverImageUrl coverImageKey totalLessons')
    .sort('-createdAt')
    .lean();

  // Drop orphans (student or course deleted) defensively.
  enrollments = enrollments.filter((e) => e.studentId && e.courseId);

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    enrollments = enrollments.filter((e) =>
      [e.studentId.firstName, e.studentId.lastName, e.studentId.email, e.courseId.title]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  // Covers live in a private bucket — presign for display.
  await Promise.all(
    enrollments.map(async (e) => {
      if (e.courseId?.coverImageKey) {
        const url = await signS3Url(e.courseId.coverImageKey, 24 * 3600);
        if (url) e.courseId.coverImageUrl = url;
      }
    }),
  );

  const data = enrollments.map((e) => ({
    _id: e._id,
    status: e.status,
    progressPercent: e.progressPercent,
    completedLessons: e.completedLessons,
    enrolledAt: e.enrolledAt,
    completedAt: e.completedAt,
    lastAccessedAt: e.lastAccessedAt,
    student: e.studentId,
    course: e.courseId,
  }));
  return ok(res, data);
});

module.exports = { enrollStudents, listEnrollments, listAllEnrollments, updateEnrollment, deleteEnrollment };
