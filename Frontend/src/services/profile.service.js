import { apiPut, apiPost, apiUpload } from '../lib/api';

/**
 * Current-user profile operations, backed by the MongoDB course-auth API (`/api/course-auth/*`).
 *   • updateMe       → PUT  /course-auth/me        (name, contact, address)
 *   • changePassword → POST /course-auth/password  (change password)
 *   • uploadAvatar   → POST /course-auth/avatar    (multipart image → S3, sets profileImage)
 */
const ProfileService = {
  updateMe(data) {
    return apiPut('/course-auth/me', data);
  },

  changePassword({ currentPassword, newPassword }) {
    return apiPost('/course-auth/password', { currentPassword, newPassword });
  },

  uploadAvatar(file) {
    const fd = new FormData();
    fd.append('avatar', file);
    return apiUpload('/course-auth/avatar', fd);
  },
};

export default ProfileService;
