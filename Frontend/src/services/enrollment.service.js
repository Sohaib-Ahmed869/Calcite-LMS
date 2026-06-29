import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';

/**
 * Enrollment management API. Global list + per-course bulk enrol + per-record status/delete.
 * Responses use the `{ success, data }` envelope (auto-unwrapped by api.js).
 */
export const EnrollmentService = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.courseId && params.courseId !== 'all') qs.set('courseId', params.courseId);
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    const q = qs.toString();
    return apiGet(`/enrollments${q ? `?${q}` : ''}`);
  },
  // Enrol one or many students into a course → { results, enrolled, skippedInvalidUsers }
  enroll: (courseId, studentIds) => apiPost(`/courses/${courseId}/enrollments`, { studentIds }),
  setStatus: (enrollmentId, status) => apiPatch(`/course-enrollments/${enrollmentId}`, { status }),
  remove: (enrollmentId) => apiDelete(`/course-enrollments/${enrollmentId}`),
};

export default EnrollmentService;
