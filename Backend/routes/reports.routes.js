const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/reports.controller');

// Admin analytics. Mounted after the global `authenticate` in server.js.
const router = express.Router();

router.get('/reports/overview', requireAdmin, c.getOverview);

module.exports = router;
