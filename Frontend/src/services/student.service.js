import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../lib/api';

/**
 * Admin student management API (`/api/students/*`, MongoDB users with the "student" role).
 * Responses use the `{ success, data }` envelope, already unwrapped by api.js.
 */
export const StudentService = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    const q = qs.toString();
    return apiGet(`/students${q ? `?${q}` : ''}`);
  },
  get: (id) => apiGet(`/students/${id}`),
  checkEmail: (email) => apiGet(`/students/check-email?email=${encodeURIComponent(email)}`),
  create: (body) => apiPost('/students', body),
  update: (id, body) => apiPut(`/students/${id}`, body),
  setStatus: (id, isActive) => apiPatch(`/students/${id}/status`, { isActive }),
  resetPassword: (id, newPassword) => apiPost(`/students/${id}/password`, { newPassword }),
  enroll: (id, courseId) => apiPost(`/students/${id}/enrollments`, { courseId }),
  remove: (id) => apiDelete(`/students/${id}`),
  // Enrolment record actions (shared course-enrollment endpoints).
  unenroll: (enrollmentId) => apiDelete(`/course-enrollments/${enrollmentId}`),
  setEnrollmentStatus: (enrollmentId, status) => apiPatch(`/course-enrollments/${enrollmentId}`, { status }),
};

export default StudentService;
