const User = require('../models/User');
const { ok, fail, wrap } = require('../utils/http');
const { getSignedUrl, deleteFileFromS3 } = require('../middleware/upload');

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Build the client-facing user object: secrets stripped, avatar key turned into a fresh signed URL,
 * and a singular `role` exposed alongside `roles` for the portal UI.
 */
async function serializeUser(user) {
  if (!user) return null;
  const roles = user.roles || [];
  const displayName = (user.displayName && user.displayName.trim()) || [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const avatarUrl = user.avatar ? (await getSignedUrl(user.avatar, 3600)) || '' : '';
  const addr = user.address || {};
  return {
    id: user._id,
    _id: user._id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    displayName,
    email: user.email,
    phone: user.phone || '',
    country: user.country || '',
    address: {
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
    },
    roles,
    role: roles[0] || 'student',
    profileImage: avatarUrl,
    avatarUrl,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    // Always truthy for accounts that have a password, so the UI shows "Change password".
    passwordSetAt: user.passwordSetAt || user.createdAt || null,
  };
}

// Fields a user may edit about themselves (email, roles, etc. are fixed).
const EDITABLE = ['firstName', 'lastName', 'displayName', 'phone', 'country'];

/** PUT /api/course-auth/me — update the signed-in user's profile. */
const updateMe = wrap(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return fail(res, 404, 'User not found');

  const body = req.body || {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) user[key] = body[key];
  }
  if (isObj(body.address)) {
    const a = user.address || {};
    user.address = {
      street: body.address.street ?? a.street ?? '',
      city: body.address.city ?? a.city ?? '',
      state: body.address.state ?? a.state ?? '',
      postalCode: body.address.postalCode ?? a.postalCode ?? '',
    };
  }

  await user.save();
  return ok(res, { user: await serializeUser(user) });
});

/** POST /api/course-auth/password — change the signed-in user's password. */
const changePassword = wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) {
    return fail(res, 400, 'New password must be at least 6 characters');
  }

  const user = await User.findById(req.userId);
  if (!user) return fail(res, 404, 'User not found');

  const matches = await user.comparePassword(String(currentPassword || ''));
  if (!matches) return fail(res, 400, 'Current password is incorrect');

  user.password = String(newPassword); // pre-save hook hashes + stamps passwordSetAt
  await user.save();
  return ok(res, { message: 'Password updated' });
});

/** POST /api/course-auth/avatar — multipart image upload to S3; persists the object key. */
const uploadAvatar = wrap(async (req, res) => {
  if (!req.file || !req.file.key) return fail(res, 400, 'No file uploaded');

  const user = await User.findById(req.userId);
  if (!user) {
    await deleteFileFromS3(req.file.key); // don't leave an orphan in the bucket
    return fail(res, 404, 'User not found');
  }

  const oldKey = user.avatar;
  user.avatar = req.file.key;
  await user.save();
  if (oldKey && oldKey !== req.file.key) await deleteFileFromS3(oldKey);

  const serialized = await serializeUser(user);
  return ok(res, { url: serialized.avatarUrl, user: serialized }, 201);
});

module.exports = { serializeUser, updateMe, changePassword, uploadAvatar };
