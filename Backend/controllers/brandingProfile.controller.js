const bcrypt = require('bcryptjs');
const db = require('../services/brandingStore');
const { uploadsPublicPath } = require('../config/brandingConfig');
const { sanitize } = require('./brandingAuth.controller');

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Profile fields a user may edit about themselves (everything else — role, email, tenant — is fixed).
const EDITABLE = ['firstName', 'lastName', 'displayName', 'phone', 'country'];

/** PUT /api/auth/me — update the current user's own profile. */
function updateMe(req, res) {
  const body = req.body || {};

  const updated = db.update((store) => {
    const user = store.users.find((u) => u.id === req.user.id);
    if (!user) return null;

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

    return user;
  });

  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json({ user: sanitize(updated) });
}

/** POST /api/auth/password — set or change the current user's password. */
function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  // If the account already has a password, the current one must be supplied and correct.
  if (req.user.passwordHash) {
    if (!currentPassword || !bcrypt.compareSync(String(currentPassword), req.user.passwordHash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
  }

  db.update((store) => {
    const user = store.users.find((u) => u.id === req.user.id);
    if (user) {
      user.passwordHash = bcrypt.hashSync(String(newPassword), 10);
      user.passwordSetAt = new Date().toISOString();
    }
  });

  res.json({ message: 'Password updated' });
}

/** POST /api/auth/avatar — multipart image upload; persists the URL as the user's profileImage. */
function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const url = `${uploadsPublicPath}/${req.file.filename}`;
  const updated = db.update((store) => {
    const user = store.users.find((u) => u.id === req.user.id);
    if (user) user.profileImage = url;
    return user;
  });

  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.status(201).json({ url, user: sanitize(updated) });
}

module.exports = { updateMe, changePassword, uploadAvatar };
