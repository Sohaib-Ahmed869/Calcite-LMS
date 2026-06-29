const crypto = require('crypto');
const Course = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const CourseLesson = require('../models/CourseLesson');
const CourseEnrollment = require('../models/CourseEnrollment');
const CourseLessonProgress = require('../models/CourseLessonProgress');
const CourseCertificate = require('../models/CourseCertificate');
const User = require('../models/User');
const { buildCertificatePdfBuffer } = require('./courseCertificatePdf.service');
const { uploadBufferToS3 } = require('../middleware/upload');

/**
 * Progress logic (single source of truth — controllers call these, never duplicate the maths):
 *   • A lesson is "done" when its CourseLessonProgress.isCompleted === true.
 *   • Overall % = round(completed published lessons / total published lessons * 100).
 *   • "Published" = lesson.isPublished AND its module.isPublished.
 *   • At 100% → enrolment becomes 'completed' (+completedAt) and a certificate is auto-issued (once).
 *   • Below 100% → a previously-'completed' enrolment reverts to 'active' (e.g. a lesson was added).
 */

/** IDs of every currently-published lesson in a course (published lesson within a published module). */
async function getPublishedLessonIds(courseId) {
  const publishedModuleIds = await CourseModule.find({ courseId, isPublished: true }).distinct('_id');
  if (!publishedModuleIds.length) return [];
  return CourseLesson.find({ courseId, isPublished: true, moduleId: { $in: publishedModuleIds } }).distinct('_id');
}

/** Recompute and persist Course.totalLessons (= published lesson count). Returns the published IDs. */
async function recomputeCourseTotals(courseId) {
  const ids = await getPublishedLessonIds(courseId);
  await Course.findByIdAndUpdate(courseId, { totalLessons: ids.length });
  return ids;
}

async function computeTotalHours(lessonIds) {
  if (!lessonIds.length) return 0;
  const lessons = await CourseLesson.find({ _id: { $in: lessonIds } }).select('duration');
  const seconds = lessons.reduce((s, l) => s + (l.duration || 0), 0);
  return Math.round((seconds / 3600) * 10) / 10; // 1 decimal place
}

async function uniqueCertificateNumber() {
  const year = new Date().getFullYear();
  // Loop until we find an unused number (collisions are astronomically unlikely).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = `CERT-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const exists = await CourseCertificate.exists({ certificateNumber: candidate });
    if (!exists) return candidate;
  }
}

/** Issue a certificate (idempotent — one per student per course). Generates the PDF and stores it in S3. */
async function issueCertificate({ courseId, studentId, publishedLessonIds }) {
  let cert = await CourseCertificate.findOne({ studentId, courseId });
  if (cert) return cert;

  const [course, student] = await Promise.all([Course.findById(courseId), User.findById(studentId)]);
  if (!course || !student) return null;

  const totalHours = await computeTotalHours(publishedLessonIds || (await getPublishedLessonIds(courseId)));
  const certificateNumber = await uniqueCertificateNumber();

  try {
    cert = await CourseCertificate.create({
      studentId,
      courseId,
      certificateNumber,
      completionDate: new Date(),
      metadata: { courseTitle: course.title, totalHours, achievements: ['Completed all lessons'] },
    });
  } catch (e) {
    // Lost a race on the unique {studentId, courseId} index — return the winner.
    if (e.code === 11000) return CourseCertificate.findOne({ studentId, courseId });
    throw e;
  }

  // Generate the PDF and upload to S3. Best-effort: a storage failure must not block completion.
  try {
    const buffer = await buildCertificatePdfBuffer({
      studentName: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
      courseTitle: course.title,
      completionDate: cert.completionDate,
      certificateNumber,
      totalHours,
    });
    const key = `courses/certificates/${courseId}/${cert._id}.pdf`;
    await uploadBufferToS3(buffer, key, 'application/pdf');
    cert.certificateUrl = key; // store the S3 key; served via short-lived signed URL
    await cert.save();
  } catch (e) {
    console.warn('[certificate] PDF generation/upload failed:', e.message);
  }

  return cert;
}

/** Recompute one student's enrolment progress; handles completion + certificate issuance. */
async function recomputeEnrollmentProgress({ courseId, studentId, publishedLessonIds }) {
  const ids = publishedLessonIds || (await getPublishedLessonIds(courseId));
  const total = ids.length;

  const enrollment = await CourseEnrollment.findOne({ courseId, studentId });
  if (!enrollment) return null;

  const completed = total === 0
    ? 0
    : await CourseLessonProgress.countDocuments({ studentId, lessonId: { $in: ids }, isCompleted: true });
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  enrollment.completedLessons = completed;
  enrollment.progressPercent = percent;

  if (total > 0 && percent >= 100) {
    if (enrollment.status === 'active') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }
    await enrollment.save();
    await issueCertificate({ courseId, studentId, publishedLessonIds: ids });
  } else {
    // Fell below 100 (e.g. a new lesson was published) → undo completion.
    if (enrollment.status === 'completed') {
      enrollment.status = 'active';
      enrollment.completedAt = null;
    }
    await enrollment.save();
  }

  return enrollment;
}

/** Recompute Course.totalLessons AND every enrolment's progress (after lessons change). */
async function recomputeAllEnrollmentsForCourse(courseId) {
  const ids = await recomputeCourseTotals(courseId);
  const enrollments = await CourseEnrollment.find({ courseId }).select('studentId');
  for (const e of enrollments) {
    await recomputeEnrollmentProgress({ courseId, studentId: e.studentId, publishedLessonIds: ids });
  }
}

module.exports = {
  getPublishedLessonIds,
  recomputeCourseTotals,
  recomputeEnrollmentProgress,
  recomputeAllEnrollmentsForCourse,
  issueCertificate,
  computeTotalHours,
};
