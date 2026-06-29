const express = require('express');
const { resolveTenant } = require('../middleware/tenant');
const { requireAuth } = require('../middleware/brandingAuth');
const { upload } = require('../middleware/brandingUpload');
const { getBranding, updateBranding, uploadAsset } = require('../controllers/branding.controller');

// Mounted at /api/tenant — per-tenant branding (resolved by X-Tenant-Code).
const router = express.Router();

// Public — the dynamic-theming engine fetches this on boot (no auth).
router.get('/branding', resolveTenant, getBranding);

// Admin-only writes.
router.put('/branding', resolveTenant, requireAuth, updateBranding);
router.post('/branding/asset', resolveTenant, requireAuth, upload.single('file'), uploadAsset);

module.exports = router;
