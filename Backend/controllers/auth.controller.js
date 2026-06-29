const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ok, fail, wrap } = require('../utils/http');
const { serializeUser } = require('./profile.controller');

const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-course-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/course-auth/login — { email, password } → { token, user }
const login = wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 400, 'Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || user.isActive === false) return fail(res, 401, 'Invalid email or password');

  const match = await user.comparePassword(password);
  if (!match) return fail(res, 401, 'Invalid email or password');

  const token = jwt.sign({ userId: user._id, type: 'access' }, JWT_SECRET(), { expiresIn: JWT_EXPIRES_IN });
  return ok(res, { token, user: await serializeUser(user) });
});

// GET /api/course-auth/me — full profile of the signed-in user (requires authenticate)
const me = wrap(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return fail(res, 404, 'User not found');
  return ok(res, { user: await serializeUser(user) });
});

module.exports = { login, me };
