const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../services/brandingStore');
const { jwtSecret, jwtExpiresIn } = require('../config/brandingConfig');

/** Strip secrets before sending a user to the client. */
function sanitize(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, tenant: user.tenantCode }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

/** POST /api/auth/login — { email, password } scoped to the X-Tenant-Code tenant. */
function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.findUserByEmail(req.tenant.code, email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json({ token: signToken(user), user: sanitize(user) });
}

/** GET /api/auth/me — current user from the Bearer token. */
function me(req, res) {
  return res.json({ user: sanitize(req.user) });
}

module.exports = { login, me, sanitize };
