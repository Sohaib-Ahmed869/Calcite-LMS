const express = require('express');
const { resolveTenant } = require('../middleware/tenant');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/brandingUpload');
const { getBranding, updateBranding, uploadAsset } = require('../controllers/branding.controller');

// Mounted at /api/tenant — per-tenant branding (resolved by X-Tenant-Code).
const router = express.Router();

// Public — the dynamic-theming engine fetches this on boot (no auth).
router.get('/branding', resolveTenant, getBranding);

// Admin-only writes — authenticated via the MongoDB course token (same as the rest of the app).
router.put('/branding', resolveTenant, authenticate, requireAdmin, updateBranding);
router.post('/branding/asset', resolveTenant, authenticate, requireAdmin, upload.single('file'), uploadAsset);

module.exports = router;
