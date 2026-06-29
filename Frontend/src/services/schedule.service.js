import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

/**
 * Schedule (academic calendar) API. Responses use the `{ success, data }` envelope, which `api.js`
 * unwraps — so these resolve directly to the payload. An event optionally links to a course.
 */
export const ScheduleService = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'all') qs.set(k, v);
    });
    const q = qs.toString();
    return apiGet(`/schedule${q ? `?${q}` : ''}`);
  },
  get: (id) => apiGet(`/schedule/${id}`),
  create: (body) => apiPost('/schedule', body),
  update: (id, body) => apiPut(`/schedule/${id}`, body),
  remove: (id) => apiDelete(`/schedule/${id}`),
};

export default ScheduleService;
