const express = require('express');
const { authenticate } = require('../middleware/auth');
const { uploadUserAvatar } = require('../middleware/upload');
const { login, me } = require('../controllers/auth.controller');
const { updateMe, changePassword, uploadAvatar } = require('../controllers/profile.controller');

// Course-subsystem auth (Mongo + roles). Namespaced under /course-auth so it doesn't collide with
// the branding portal auth at /api/auth. Mounted in server.js BEFORE the global authenticate, so the
// protected routes below apply `authenticate` explicitly.
const router = express.Router();

router.post('/course-auth/login', login);
router.get('/course-auth/me', authenticate, me);

// Self-service profile management for the signed-in user.
router.put('/course-auth/me', authenticate, updateMe);
router.post('/course-auth/password', authenticate, changePassword);
router.post('/course-auth/avatar', authenticate, uploadUserAvatar, uploadAvatar);

module.exports = router;
