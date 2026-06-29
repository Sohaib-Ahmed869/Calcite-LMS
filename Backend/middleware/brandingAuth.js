const jwt = require('jsonwebtoken');
const db = require('../services/brandingStore');
const { jwtSecret } = require('../config/brandingConfig');

function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Session no longer valid' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
