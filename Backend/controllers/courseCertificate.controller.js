const CourseCertificate = require('../models/CourseCertificate');
const { ok, fail, isValidId, wrap } = require('../utils/http');
const { getSignedUrl } = require('../middleware/upload');

// GET /api/courses/:courseId/certificate (student) — my certificate + a signed PDF URL.
const getMyCertificate = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');

  const cert = await CourseCertificate.findOne({ courseId, studentId: req.userId }).lean();
  if (!cert) return fail(res, 404, 'No certificate yet — complete the course to earn one');

  // certificateUrl stores the S3 key; hand back a short-lived signed download URL.
  let downloadUrl = null;
  if (cert.certificateUrl) downloadUrl = await getSignedUrl(cert.certificateUrl, 3600);
  return ok(res, { ...cert, downloadUrl });
});

// GET /api/courses/:courseId/certificates (admin) — all certificates issued for a course.
const listCertificates = wrap(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidId(courseId)) return fail(res, 400, 'Invalid course id');
  const certs = await CourseCertificate.find({ courseId })
    .populate('studentId', 'firstName lastName email')
    .sort('-completionDate')
    .lean();
  return ok(res, certs.map((c) => ({ ...c, student: c.studentId })));
});

module.exports = { getMyCertificate, listCertificates };
