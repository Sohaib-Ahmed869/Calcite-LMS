const express = require('express');
const { resolveTenant } = require('../middleware/tenant');
const { requireAuth } = require('../middleware/brandingAuth');
const { upload } = require('../middleware/brandingUpload');
const { login, me } = require('../controllers/brandingAuth.controller');
const { updateMe, changePassword, uploadAvatar } = require('../controllers/brandingProfile.controller');

// Mounted at /api/auth — the branding/portal auth (JSON store, tenant-scoped).
const router = express.Router();

router.post('/login', resolveTenant, login);
router.get('/me', requireAuth, me);

// Self-service profile management for the signed-in user.
router.put('/me', requireAuth, updateMe);
router.post('/password', requireAuth, changePassword);
router.post('/avatar', resolveTenant, requireAuth, upload.single('avatar'), uploadAvatar);

module.exports = router;
