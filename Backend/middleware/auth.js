

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Roles that count as "admin" for course management (matches the project convention).
const ADMIN_ROLES = ['admin', 'super_admin', 'calcite_administrator'];

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required', message: 'No authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-course-secret-change-me');

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token', message: 'Please use an access token' });
    }

    // Load fresh user context from DB (single source of truth) — roles can change after a token is issued.
    const dbUser = await User.findById(decoded.userId).select('firstName lastName email roles isActive');
    if (!dbUser || dbUser.isActive === false) {
      return res.status(401).json({ error: 'Authentication required', message: 'User not found or inactive' });
    }

    req.userId = dbUser._id;
    req.userRoles = dbUser.roles || [];
    req.userEmail = dbUser.email;
    req.user = {
      _id: dbUser._id,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      email: dbUser.email,
      roles: dbUser.roles || [],
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', message: 'The provided token is invalid' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', message: 'Your session has expired. Please login again.' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication error', message: 'An error occurred during authentication' });
  }
};

/** True if the request user holds any admin role. */
const isAdmin = (req) => Array.isArray(req.userRoles) && req.userRoles.some((r) => ADMIN_ROLES.includes(r));

/** Guard: only admin/super_admin/calcite_administrator may pass. Use after `authenticate`. */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!isAdmin(req)) {
    return res.status(403).json({
      error: 'Insufficient role',
      message: 'Only administrators can perform this action',
      userRoles: req.userRoles,
    });
  }
  next();
};

module.exports = { authenticate, requireAdmin, isAdmin, ADMIN_ROLES };
