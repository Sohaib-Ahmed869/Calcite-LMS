const User = require('../models/User');
const Course = require('../models/Course');
const CourseEnrollment = require('../models/CourseEnrollment');
const CourseLessonProgress = require('../models/CourseLessonProgress');
const CourseNote = require('../models/CourseNote');
const CourseBookmark = require('../models/CourseBookmark');
const CourseCertificate = require('../models/CourseCertificate');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const progress = require('../services/courseProgress.service');
const { getSignedUrl: signS3Url } = require('../middleware/upload');

const STUDENT_ROLE = 'student';
const isStudent = (u) => u && (u.roles || []).includes(STUDENT_ROLE);

/** Client-facing student object — no secrets. (Avatar is not signed here; the list shows initials.) */
function sanitize(user) {
  if (!user) return null;
  const roles = user.roles || [];
  const displayName = (user.displayName && user.displayName.trim()) || [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const a = user.address || {};
  return {
    id: user._id,
    _id: user._id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    displayName,
    email: user.email,
    phone: user.phone || '',
    country: user.country || '',
    address: { street: a.street || '', city: a.city || '', state: a.state || '', postalCode: a.postalCode || '' },
    roles,
    role: roles[0] || 'student',
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    passwordSetAt: user.passwordSetAt || user.createdAt || null,
  };
}

// GET /api/students?search=&status=active|inactive
const listStudents = wrap(async (req, res) => {
  const { search, status } = req.query;
  const filter = { roles: STUDENT_ROLE };
  if (status === 'active') filter.isActive = true;
  else if (status === 'inactive') filter.isActive = false;
  if (search && search.trim()) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
  }

  const users = await User.find(filter).sort('-createdAt').lean();
  const ids = users.map((u) => u._id);
  const counts = ids.length
    ? await CourseEnrollment.aggregate([
        { $match: { studentId: { $in: ids } } },
        { $group: { _id: '$studentId', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      ])
    : [];
  const cmap = new Map(counts.map((c) => [String(c._id), c]));

  const data = users.map((u) => ({
    ...sanitize(u),
    enrollmentCount: cmap.get(String(u._id))?.total || 0,
    completedCount: cmap.get(String(u._id))?.completed || 0,
  }));
  return ok(res, data);
});

// GET /api/students/:id — profile + enrollments (with course + progress)
const getStudent = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid student id');
  const user = await User.findById(id);
  if (!isStudent(user)) return fail(res, 404, 'Student not found');

  const enrollments = await CourseEnrollment.find({ studentId: id })
    .populate('courseId', 'title status coverImageUrl coverImageKey totalLessons level')
    .sort('-createdAt')
    .lean();

  const data = enrollments
    .filter((e) => e.courseId)
    .map((e) => ({
      _id: e._id,
      status: e.status,
      progressPercent: e.progressPercent,
      completedLessons: e.completedLessons,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      lastAccessedAt: e.lastAccessedAt,
      course: e.courseId,
    }));

  // Covers sit in a private S3 bucket — swap each raw URL for a short-lived presigned one.
  await Promise.all(
    data.map(async (d) => {
      if (d.course?.coverImageKey) {
        const url = await signS3Url(d.course.coverImageKey, 24 * 3600);
        if (url) d.course.coverImageUrl = url;
      }
    }),
  );

  return ok(res, { ...sanitize(user), enrollments: data });
});

// POST /api/students — create a student account
const createStudent = wrap(async (req, res) => {
  const { firstName, lastName, email, password, phone, country } = req.body || {};
  if (!firstName?.trim() || !lastName?.trim()) return fail(res, 400, 'First and last name are required');
  if (!email?.trim()) return fail(res, 400, 'Email is required');
  if (!password || String(password).length < 6) return fail(res, 400, 'Password must be at least 6 characters');

  const normalized = String(email).toLowerCase().trim();
  if (await User.findOne({ email: normalized })) return fail(res, 409, 'A user with this email already exists');

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalized,
    password: String(password),
    phone: phone?.trim() || '',
    country: country?.trim() || '',
    roles: [STUDENT_ROLE],
    isActive: true,
  });
  return ok(res, sanitize(user), 201);
});

// PUT /api/students/:id — update profile fields
const updateStudent = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid student id');
  const user = await User.findById(id);
  if (!isStudent(user)) return fail(res, 404, 'Student not found');

  const b = req.body || {};
  for (const f of ['firstName', 'lastName', 'displayName', 'phone', 'country']) {
    if (b[f] !== undefined) user[f] = b[f];
  }
  if (b.address && typeof b.address === 'object') {
    const a = user.address || {};
    user.address = {
      street: b.address.street ?? a.street ?? '',
      city: b.address.city ?? a.city ?? '',
      state: b.address.state ?? a.state ?? '',
      postalCode: b.address.postalCode ?? a.postalCode ?? '',
    };
  }
  await user.save();
  return ok(res, sanitize(user));
});

// PATCH /api/students/:id/status — activate / deactivate (toggles when no body)
const setStudentStatus = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid student id');
  const user = await User.findById(id);
  if (!isStudent(user)) return fail(res, 404, 'Student not found');

  user.isActive = req.body.isActive !== undefined ? !!req.body.isActive : !user.isActive;
  await user.save();
  return ok(res, sanitize(user));
});

// POST /api/students/:id/password — admin password reset
const resetStudentPassword = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid student id');
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) return fail(res, 400, 'Password must be at least 6 characters');
  const user = await User.findById(id);
  if (!isStudent(user)) return fail(res, 404, 'Student not found');

  user.password = String(newPassword); // pre-save hook hashes + stamps passwordSetAt
  await user.save();
  return ok(res, { message: 'Password reset' });
});

// DELETE /api/students/:id — delete student + their course data
const deleteStudent = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid student id');
  const user = await User.findById(id);
  if (!isStudent(user)) return fail(res, 404, 'Student not found');

  await Promise.all([
    CourseEnrollment.deleteMany({ studentId: id }),
    CourseLessonProgress.deleteMany({ studentId: id }),
    CourseNote.deleteMany({ studentId: id }),
    CourseBookmark.deleteMany({ studentId: id }),
    CourseCertificate.deleteMany({ studentId: id }),
  ]);
  await user.deleteOne();
  return ok(res, { deleted: true });
});

// POST /api/students/:id/enrollments — enrol the student into a course ({ courseId })
const enrollStudent = wrap(async (req, res) => {
  const { id } = req.params;
  const { courseId } = req.body || {};
  if (!isValidId(id) || !isValidId(courseId)) return fail(res, 400, 'Invalid id');

  const [user, course] = await Promise.all([User.findById(id), Course.findById(courseId)]);
  if (!isStudent(user)) return fail(res, 404, 'Student not found');
  if (!course) return fail(res, 404, 'Course not found');

  let e = await CourseEnrollment.findOne({ courseId, studentId: id });
  if (e) {
    if (['withdrawn', 'suspended'].includes(e.status)) {
      e.status = 'active';
      await e.save();
    } else {
      return fail(res, 409, 'Student is already enrolled in this course');
    }
  } else {
    e = await CourseEnrollment.create({ courseId, studentId: id, enrolledBy: req.userId });
  }
  await progress.recomputeEnrollmentProgress({ courseId, studentId: id });
  return ok(res, e, 201);
});

module.exports = {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  setStudentStatus,
  resetStudentPassword,
  deleteStudent,
  enrollStudent,
};
