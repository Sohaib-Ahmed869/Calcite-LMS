/**
 * Student LMS API — thin wrappers over the course subsystem (`{ success, data }` envelope is already
 * unwrapped by lib/api, so each call resolves to the `data` payload directly).
 *
 * There is no single "player context" endpoint, so the player page composes a course from:
 *   getCourse → getModules → getLessons(per module) → getCourseProgress → getReviews → getCertificate.
 * Notes and bookmarks are per-lesson and load when a lesson is opened.
 */
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../lib/api';

/* ---- Courses ---------------------------------------------------------- */

/** My enrolments: [{ enrollmentId, status, progressPercent, completedLessons, enrolledAt, completedAt, course }]. */
export const getMyCourses = () => apiGet('/courses/my');

/** A single course I'm enrolled in (adds `enrollment: { status, progressPercent, completedLessons }`). */
export const getCourse = (courseId) => apiGet(`/courses/${courseId}`);

/** Per-course progress: { overall: { progressPercent, completedLessons, status, completedAt }, lessons: [...] }. */
export const getCourseProgress = (courseId) => apiGet(`/courses/${courseId}/progress`);

/* ---- Curriculum ------------------------------------------------------- */

/** Published modules for a course (student view), sorted by displayOrder. */
export const getModules = (courseId) => apiGet(`/course-modules/course/${courseId}`);

/** Published lessons for a module (student view — no fileKey), sorted by displayOrder. */
export const getLessons = (moduleId) => apiGet(`/course-lessons/module/${moduleId}`);

/** Playback descriptor: { url, kind: 'external'|'file'|'text', contentType, fileName?, textContent? }. */
export const getLessonUrl = (lessonId) => apiGet(`/course-lessons/${lessonId}/url`);

/* ---- Progress --------------------------------------------------------- */

/** Save resume position / time spent. Body: { lastViewedPosition, progressSeconds, timeSpentDelta, countView }. */
export const saveLessonProgress = (lessonId, body) => apiPost(`/course-lessons/${lessonId}/progress`, body);

/** Mark a lesson (in)complete → { progress, enrollment }. Enrolment may flip to completed + issue a certificate. */
export const setLessonComplete = (lessonId, isCompleted = true) =>
  apiPatch(`/course-lessons/${lessonId}/complete`, { isCompleted });

/* ---- Notes ------------------------------------------------------------ */

export const getNotes = (lessonId) => apiGet(`/course-lessons/${lessonId}/notes`);
export const createNote = (lessonId, body) => apiPost(`/course-lessons/${lessonId}/notes`, body);
export const updateNote = (noteId, body) => apiPut(`/course-notes/${noteId}`, body);
export const deleteNote = (noteId) => apiDelete(`/course-notes/${noteId}`);

/* ---- Bookmarks -------------------------------------------------------- */

export const getBookmarks = (lessonId) => apiGet(`/course-lessons/${lessonId}/bookmarks`);
export const createBookmark = (lessonId, body) => apiPost(`/course-lessons/${lessonId}/bookmarks`, body);
export const deleteBookmark = (bookmarkId) => apiDelete(`/course-bookmarks/${bookmarkId}`);

/* ---- Reviews ---------------------------------------------------------- */

/** { reviews: [{ _id, student, rating, reviewText, helpfulCount, markedHelpful, createdAt }], averageRating, count }. */
export const getReviews = (courseId) => apiGet(`/courses/${courseId}/reviews`);
/** Upsert my review. Body: { rating, reviewText }. */
export const submitReview = (courseId, body) => apiPost(`/courses/${courseId}/reviews`, body);
/** Toggle "helpful" → { helpfulCount, markedHelpful }. */
export const toggleReviewHelpful = (reviewId) => apiPatch(`/course-reviews/${reviewId}/helpful`);

/* ---- Certificate ------------------------------------------------------ */

/** My certificate for a course: { ...certificate, downloadUrl } (404 until 100% complete). */
export const getCertificate = (courseId) => apiGet(`/courses/${courseId}/certificate`);
