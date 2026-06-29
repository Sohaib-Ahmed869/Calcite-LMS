import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '../lib/api';

/**
 * Course content API (MongoDB course subsystem). Every response is the `{ success, data }` envelope,
 * which `api.js` already unwraps — so these resolve directly to the `data` payload.
 *
 * Hierarchy: Course → CourseModule → CourseLesson ("resource"/"learning material").
 */
export const CourseService = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    const q = qs.toString();
    return apiGet(`/courses${q ? `?${q}` : ''}`);
  },
  get: (id) => apiGet(`/courses/${id}`),
  // Always multipart so an optional cover image (field "coverImage") rides along with the fields.
  create: (formData) => apiUpload('/courses', formData),
  update: (id, formData) => apiUpload(`/courses/${id}`, formData, { method: 'PUT' }),
  remove: (id) => apiDelete(`/courses/${id}`),
  publish: (id, status) => apiPatch(`/courses/${id}/publish`, status ? { status } : {}),
};

export const ModuleService = {
  list: (courseId) => apiGet(`/course-modules/course/${courseId}`),
  create: (courseId, body) => apiPost(`/courses/${courseId}/modules`, body),
  update: (id, body) => apiPut(`/course-modules/${id}`, body),
  remove: (id) => apiDelete(`/course-modules/${id}`),
  reorder: (courseId, moduleIds) => apiPatch('/course-modules/reorder', { courseId, moduleIds }),
};

export const LessonService = {
  list: (moduleId) => apiGet(`/course-lessons/module/${moduleId}`),
  // FormData → multipart (uploaded file); plain object → JSON (external link / text content).
  create: (data) => (data instanceof FormData ? apiUpload('/course-lessons', data) : apiPost('/course-lessons', data)),
  update: (id, data) => (data instanceof FormData ? apiUpload(`/course-lessons/${id}`, data, { method: 'PUT' }) : apiPut(`/course-lessons/${id}`, data)),
  remove: (id) => apiDelete(`/course-lessons/${id}`),
  publish: (id, isPublished) => apiPatch(`/course-lessons/${id}/publish`, { isPublished }),
  reorder: (moduleId, lessonIds) => apiPatch('/course-lessons/reorder', { moduleId, lessonIds }),
  url: (id) => apiGet(`/course-lessons/${id}/url`),
};
