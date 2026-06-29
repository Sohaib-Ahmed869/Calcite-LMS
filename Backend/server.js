require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const { authenticate } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');
const { port, uploadsDir, uploadsPublicPath } = require('./config/brandingConfig');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve branding assets uploaded to local disk (logos/favicons/avatars).
app.use(uploadsPublicPath, express.static(uploadsDir));

// ── Public ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'lms-api', subsystems: ['branding', 'course'] }));
app.get('/', (req, res) => res.json({ service: 'lms-api', api: '/api', health: '/api/health' }));

// ── Branding subsystem (JSON store; each route does its own tenant/auth) ───────
app.use('/api/auth', require('./routes/brandingAuth.routes'));
app.use('/api/tenant', require('./routes/tenant.routes'));

// ── Course subsystem (MongoDB) ────────────────────────────────────────────────
// Public course auth (login) is namespaced as /api/course-auth to avoid the branding /api/auth.
app.use('/api', require('./routes/auth.routes'));
// Everything below requires a valid course token (applied once).
app.use('/api', authenticate);
const courseRouters = [
  require('./routes/student.routes'),
  require('./routes/user.routes'),
  require('./routes/reports.routes'),
  require('./routes/course.routes'),
  require('./routes/scheduleEvent.routes'),
  require('./routes/courseModule.routes'),
  require('./routes/courseLesson.routes'),
  require('./routes/courseEnrollment.routes'),
  require('./routes/courseProgress.routes'),
  require('./routes/courseNote.routes'),
  require('./routes/courseBookmark.routes'),
  require('./routes/courseReview.routes'),
  require('./routes/courseCertificate.routes'),
];
courseRouters.forEach((r) => app.use('/api', r));

// ── 404 + error handlers ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// Boot: try Mongo (non-fatal), then listen regardless so branding always works.
connectDB().finally(() => {
  app.listen(port, () => {
    console.log(`\n  LMS API listening on http://localhost:${port}`);
    console.log(`  API base:        http://localhost:${port}/api`);
    console.log(`  Health:          http://localhost:${port}/api/health`);
    console.log(`  Branding auth:   POST /api/auth/login        (tenant: X-Tenant-Code)`);
    console.log(`  Course auth:     POST /api/course-auth/login (MongoDB users)\n`);
  });
});

module.exports = app;
