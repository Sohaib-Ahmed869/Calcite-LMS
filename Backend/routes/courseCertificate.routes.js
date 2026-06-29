const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/courseCertificate.controller');

const router = express.Router();

// Admin — all certificates for a course (plural)
router.get('/courses/:courseId/certificates', requireAdmin, c.listCertificates);
// Student — my certificate for a course (singular), with a signed PDF URL
router.get('/courses/:courseId/certificate', c.getMyCertificate);

module.exports = router;
