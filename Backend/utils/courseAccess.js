const Course = require('../models/Course');
const CourseEnrollment = require('../models/CourseEnrollment');

// Statuses that still grant a student read access to course content (completed students keep access
// so they can revisit lessons and download their certificate).
const ACCESS_STATUSES = ['active', 'completed'];

/** The student's enrolment for a course if it grants access, else null. */
async function getAccessEnrollment(studentId, courseId) {
  return CourseEnrollment.findOne({ courseId, studentId, status: { $in: ACCESS_STATUSES } });
}

/**
 * Resolve a course a student is allowed to view: it must be published AND the student must hold an
 * access-granting enrolment. Returns { course, enrollment } or throws an HttpError (403/404).
 */
async function requireStudentCourseAccess(studentId, courseId) {
  const course = await Course.findById(courseId);
  if (!course || course.isActive === false) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }
  const enrollment = await getAccessEnrollment(studentId, courseId);
  if (!enrollment || course.status !== 'published') {
    const err = new Error('You are not enrolled in this course');
    err.status = 403;
    throw err;
  }
  return { course, enrollment };
}

module.exports = { getAccessEnrollment, requireStudentCourseAccess, ACCESS_STATUSES };
