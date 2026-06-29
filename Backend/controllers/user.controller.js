const User = require('../models/User');
const CourseEnrollment = require('../models/CourseEnrollment');
const CourseLessonProgress = require('../models/CourseLessonProgress');
const CourseNote = require('../models/CourseNote');
const CourseBookmark = require('../models/CourseBookmark');
const CourseCertificate = require('../models/CourseCertificate');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { ADMIN_ROLES } = require('../middleware/auth');
const { getSignedUrl: signS3Url } = require('../middleware/upload');

// Roles an admin may assign here = the admin roles (source of truth: auth middleware) + staff/learner.
const ASSIGNABLE_ROLES = [...ADMIN_ROLES, 'instructor', 'student'];
const ALLOWED = new Set(ASSIGNABLE_ROLES);

const hasAdminRole = (roles = []) => roles.some((r) => ADMIN_ROLES.includes(r));
const isActiveAdmin = (user) => user && user.isActive !== false && hasAdminRole(user.roles || []);
// Number of accounts that can still administer the portal — used to prevent locking everyone out.
const activeAdminCount = () => User.countDocuments({ isActive: true, roles: { $in: ADMIN_ROLES } });

// Clean + validate a roles array; returns a de-duped subset of ALLOWED, or null if nothing valid.
function cleanRoles(input) {
  if (!Array.isArray(input)) return null;
  const roles = [...new Set(input.map((r) => String(r).trim()).filter((r) => ALLOWED.has(r)))];
  return roles.length ? roles : null;
}

/** Client-facing user object — no secrets; avatar key turned into a short-lived signed URL. */
async function serialize(user) {
  if (!user) return null;
  const roles = user.roles || [];
  const displayName = (user.displayName && user.displayName.trim()) || [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const avatarUrl = user.avatar ? (await signS3Url(user.avatar, 24 * 3600)) || '' : '';
  return {
    id: user._id,
    _id: user._id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    displayName,
    email: user.email,
    phone: user.phone || '',
    country: user.country || '',
    roles,
    isActive: user.isActive !== false,
    avatarUrl,
    profileImage: avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    passwordSetAt: user.passwordSetAt || user.createdAt || null,
  };
}

// GET /api/users — all accounts (filtering/counts are done client-side for snappy tabs).
const listUsers = wrap(async (req, res) => {
  const { search, role, status } = req.query;
  const filter = {};
  if (status === 'active') filter.isActive = true;
  else if (status === 'inactive') filter.isActive = false;
  if (role && ALLOWED.has(role)) filter.roles = role;
  if (search && search.trim()) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort('-createdAt').lean();
  const data = await Promise.all(users.map(serialize));
  return ok(res, data);
});

// GET /api/users/:id
const getUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid user id');
  const user = await User.findById(id).lean();
  if (!user) return fail(res, 404, 'User not found');
  return ok(res, await serialize(user));
});

// POST /api/users — create an account with one or more roles.
const createUser = wrap(async (req, res) => {
  const { firstName, lastName, email, password } = req.body || {};
  if (!firstName?.trim() || !lastName?.trim()) return fail(res, 400, 'First and last name are required');
  if (!email?.trim()) return fail(res, 400, 'Email is required');
  if (!password || String(password).length < 6) return fail(res, 400, 'Password must be at least 6 characters');

  const roles = cleanRoles(req.body.roles) || ['student'];
  const normalized = String(email).toLowerCase().trim();
  if (await User.findOne({ email: normalized })) return fail(res, 409, 'A user with this email already exists');

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    displayName: req.body.displayName?.trim() || '',
    email: normalized,
    password: String(password),
    phone: req.body.phone?.trim() || '',
    country: req.body.country?.trim() || '',
    roles,
    isActive: true,
  });
  return ok(res, await serialize(user), 201);
});

// PUT /api/users/:id — update profile fields and/or roles (with admin-lockout guards).
const updateUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid user id');
  const user = await User.findById(id);
  if (!user) return fail(res, 404, 'User not found');

  const b = req.body || {};
  for (const f of ['firstName', 'lastName', 'displayName', 'phone', 'country']) {
    if (b[f] !== undefined) user[f] = b[f];
  }

  if (b.roles !== undefined) {
    const roles = cleanRoles(b.roles);
    if (!roles) return fail(res, 400, 'Select at least one valid role');
    const losesAdmin = isActiveAdmin(user) && !hasAdminRole(roles);
    if (losesAdmin) {
      if (String(user._id) === String(req.userId)) return fail(res, 400, "You can't remove your own admin access");
      if ((await activeAdminCount()) <= 1) return fail(res, 400, 'At least one administrator is required');
    }
    user.roles = roles;
  }

  await user.save();
  return ok(res, await serialize(user));
});

// PATCH /api/users/:id/status — activate / deactivate (toggles when no body).
const setUserStatus = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid user id');
  const user = await User.findById(id);
  if (!user) return fail(res, 404, 'User not found');

  const next = req.body.isActive !== undefined ? !!req.body.isActive : !user.isActive;
  if (!next) {
    if (String(user._id) === String(req.userId)) return fail(res, 400, "You can't deactivate your own account");
    if (isActiveAdmin(user) && (await activeAdminCount()) <= 1) return fail(res, 400, 'At least one active administrator is required');
  }
  user.isActive = next;
  await user.save();
  return ok(res, await serialize(user));
});

// POST /api/users/:id/password — admin password reset.
const resetUserPassword = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid user id');
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) return fail(res, 400, 'Password must be at least 6 characters');
  const user = await User.findById(id);
  if (!user) return fail(res, 404, 'User not found');

  user.password = String(newPassword); // pre-save hook hashes + stamps passwordSetAt
  await user.save();
  return ok(res, { message: 'Password reset' });
});

// DELETE /api/users/:id — delete the account and cascade any course data it owns.
const deleteUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid user id');
  const user = await User.findById(id);
  if (!user) return fail(res, 404, 'User not found');

  if (String(user._id) === String(req.userId)) return fail(res, 400, "You can't delete your own account");
  if (isActiveAdmin(user) && (await activeAdminCount()) <= 1) return fail(res, 400, "Can't delete the last administrator");

  await Promise.all([
    CourseEnrollment.deleteMany({ studentId: id }),
    CourseLessonProgress.deleteMany({ studentId: id }),
    CourseNote.deleteMany({ studentId: id }),
    CourseBookmark.deleteMany({ studentId: id }),
    CourseCertificate.deleteMany({ studentId: id }),
  ]);
  await user.deleteOne();
  return ok(res, { deleted: true });
});

module.exports = { listUsers, getUser, createUser, updateUser, setUserStatus, resetUserPassword, deleteUser };
