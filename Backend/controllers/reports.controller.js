const Course = require('../models/Course');
const CourseLesson = require('../models/CourseLesson');
const CourseEnrollment = require('../models/CourseEnrollment');
const CourseCertificate = require('../models/CourseCertificate');
const User = require('../models/User');
const { ok, wrap } = require('../utils/http');

/** Build a fixed axis of the last `n` months: [{ key:'YYYY-MM', label:'Jan' }]. */
function lastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`,
      label: dt.toLocaleString('en-US', { month: 'short' }),
    });
  }
  return out;
}

const toMap = (rows, k = '_id', v = 'count') => new Map(rows.map((r) => [String(r[k]), r[v]]));

// GET /api/reports/overview (admin) — one aggregated analytics payload for the Reports dashboard.
const getOverview = wrap(async (req, res) => {
  const months = lastMonths(12);
  const trendCutoff = new Date();
  trendCutoff.setMonth(trendCutoff.getMonth() - 11, 1);
  trendCutoff.setHours(0, 0, 0, 0);

  const [
    courseStatusAgg,
    studentCount,
    activeStudentCount,
    publishedLessonCount,
    certificateCount,
    enrollStatusAgg,
    progressAgg,
    enrollTrendAgg,
    completionTrendAgg,
    topCoursesAgg,
    topStudentsAgg,
    recentEnrollments,
  ] = await Promise.all([
    Course.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ roles: 'student' }),
    User.countDocuments({ roles: 'student', isActive: true }),
    CourseLesson.countDocuments({ isPublished: true }),
    CourseCertificate.countDocuments(),
    CourseEnrollment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    CourseEnrollment.aggregate([{ $group: { _id: null, avg: { $avg: '$progressPercent' }, total: { $sum: 1 } } }]),
    CourseEnrollment.aggregate([
      { $match: { enrolledAt: { $gte: trendCutoff } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$enrolledAt' } }, count: { $sum: 1 } } },
    ]),
    CourseEnrollment.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: trendCutoff } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } }, count: { $sum: 1 } } },
    ]),
    CourseEnrollment.aggregate([
      { $group: { _id: '$courseId', enrollments: { $sum: 1 }, completions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, avgProgress: { $avg: '$progressPercent' } } },
      { $sort: { enrollments: -1 } },
      { $limit: 6 },
    ]),
    CourseEnrollment.aggregate([
      { $group: { _id: '$studentId', enrollments: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { enrollments: -1, completed: -1 } },
      { $limit: 6 },
    ]),
    CourseEnrollment.find()
      .populate('studentId', 'firstName lastName email')
      .populate('courseId', 'title')
      .sort('-enrolledAt')
      .limit(8)
      .lean(),
  ]);

  // ── Status breakdowns ──
  const courseStatus = { draft: 0, published: 0, archived: 0 };
  courseStatusAgg.forEach((r) => { courseStatus[r._id] = r.count; });
  const enrollStatus = { active: 0, completed: 0, suspended: 0, withdrawn: 0 };
  enrollStatusAgg.forEach((r) => { enrollStatus[r._id] = r.count; });

  const totalEnroll = progressAgg[0]?.total || 0;
  const avgProgress = Math.round(progressAgg[0]?.avg || 0);
  const totalCourses = courseStatus.draft + courseStatus.published + courseStatus.archived;

  // ── Trends (fill the 12-month axis) ──
  const enrollMap = toMap(enrollTrendAgg);
  const completionMap = toMap(completionTrendAgg);
  const trend = months.map((m) => ({ label: m.label, key: m.key, enrolled: enrollMap.get(m.key) || 0, completed: completionMap.get(m.key) || 0 }));

  // ── Top courses (attach titles) ──
  const courseIds = topCoursesAgg.map((c) => c._id);
  const courseDocs = await Course.find({ _id: { $in: courseIds } }).select('title status').lean();
  const courseTitle = new Map(courseDocs.map((c) => [String(c._id), c]));
  const topCourses = topCoursesAgg.map((c) => ({
    courseId: c._id,
    title: courseTitle.get(String(c._id))?.title || 'Untitled course',
    status: courseTitle.get(String(c._id))?.status || 'draft',
    enrollments: c.enrollments,
    completions: c.completions,
    completionRate: c.enrollments ? Math.round((c.completions / c.enrollments) * 100) : 0,
    avgProgress: Math.round(c.avgProgress || 0),
  }));

  // ── Top students (attach names) ──
  const studentIds = topStudentsAgg.map((s) => s._id);
  const studentDocs = await User.find({ _id: { $in: studentIds } }).select('firstName lastName email').lean();
  const studentMap = new Map(studentDocs.map((s) => [String(s._id), s]));
  const topStudents = topStudentsAgg
    .filter((s) => studentMap.has(String(s._id)))
    .map((s) => {
      const u = studentMap.get(String(s._id));
      return { studentId: s._id, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, email: u.email, enrollments: s.enrollments, completed: s.completed };
    });

  const recent = recentEnrollments
    .filter((e) => e.studentId && e.courseId)
    .map((e) => ({
      _id: e._id,
      student: { _id: e.studentId._id, name: [e.studentId.firstName, e.studentId.lastName].filter(Boolean).join(' ') || e.studentId.email, email: e.studentId.email },
      course: { _id: e.courseId._id, title: e.courseId.title },
      status: e.status,
      progressPercent: e.progressPercent,
      enrolledAt: e.enrolledAt,
    }));

  return ok(res, {
    totals: {
      courses: totalCourses,
      publishedCourses: courseStatus.published,
      draftCourses: courseStatus.draft,
      students: studentCount,
      activeStudents: activeStudentCount,
      enrollments: totalEnroll,
      activeEnrollments: enrollStatus.active,
      completedEnrollments: enrollStatus.completed,
      lessons: publishedLessonCount,
      certificates: certificateCount,
      avgProgress,
      completionRate: totalEnroll ? Math.round((enrollStatus.completed / totalEnroll) * 100) : 0,
    },
    enrollStatus,
    courseStatus,
    trend,
    topCourses,
    topStudents,
    recent,
  });
});

module.exports = { getOverview };
