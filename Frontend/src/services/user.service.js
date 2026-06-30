import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../lib/api';

/**
 * Admin user & role management API (`/api/users/*`, all MongoDB users).
 * Responses use the `{ success, data }` envelope, already unwrapped by api.js.
 */
export const UserService = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.role && params.role !== 'all') qs.set('role', params.role);
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    const q = qs.toString();
    return apiGet(`/users${q ? `?${q}` : ''}`);
  },
  get: (id) => apiGet(`/users/${id}`),
  checkEmail: (email) => apiGet(`/users/check-email?email=${encodeURIComponent(email)}`),
  create: (body) => apiPost('/users', body),
  update: (id, body) => apiPut(`/users/${id}`, body),
  setStatus: (id, isActive) => apiPatch(`/users/${id}/status`, { isActive }),
  resetPassword: (id, newPassword) => apiPost(`/users/${id}/password`, { newPassword }),
  remove: (id) => apiDelete(`/users/${id}`),
};

export default UserService;
