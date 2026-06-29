
const path = require('path');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3Client = require('../config/s3.config');
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const BUCKET = process.env.S3_BUCKET_NAME || 'miabuckets';

// Documents, slides, images, video and audio — what a lesson can be.
const ALLOWED_LESSON_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'application/zip',
  'application/x-zip-compressed',
];

const lessonFileFilter = (req, file, cb) => {
  if (ALLOWED_LESSON_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type for a lesson resource.'), false);
};

const buildKey = (folder) => (req, file, cb) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname) || '';
  // courseId may arrive in body (lesson upload) or params (cover image); fall back to "misc".
  const courseId = req.body?.courseId || req.params?.courseId || 'misc';
  cb(null, `courses/${folder}/${courseId}/${uniqueSuffix}${ext}`);
};

const makeUploader = (folder, fileFilter, maxBytes) =>
  multer({
    storage: multerS3({
      s3: s3Client,
      bucket: BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (req, file, cb) =>
        cb(null, { fieldName: file.fieldname, uploadedBy: req.userId?.toString() || 'unknown', uploadDate: new Date().toISOString() }),
      key: buildKey(folder),
    }),
    fileFilter,
    limits: { fileSize: maxBytes },
  });

// Lesson resource (single field "file") — up to 500MB for video.
const lessonUploader = makeUploader('lessons', lessonFileFilter, 500 * 1024 * 1024);

// Cover image (single field "coverImage") — images only, 5MB.
const imageFilter = (req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Cover image must be a JPEG, PNG, WebP or GIF.'), false);
};
const coverUploader = makeUploader('covers', imageFilter, 5 * 1024 * 1024);

// User avatar (single field "avatar") — images only, 5MB, keyed by user id.
const avatarImageFilter = (req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Avatar must be a JPEG, PNG, WebP or GIF.'), false);
};
const buildAvatarKey = (req, file, cb) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname) || '';
  const userId = req.userId?.toString() || 'anonymous';
  cb(null, `users/avatars/${userId}/${uniqueSuffix}${ext}`);
};
const avatarUploader = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) =>
      cb(null, { fieldName: file.fieldname, uploadedBy: req.userId?.toString() || 'unknown', uploadDate: new Date().toISOString() }),
    key: buildAvatarKey,
  }),
  fileFilter: avatarImageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Branding asset (single field "file") — logos & favicon → S3, keyed by tenant + slot. Allows SVG/ICO.
const brandingImageFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Branding asset must be an image (PNG, JPG, GIF, WebP, SVG or ICO).'), false);
};
const buildBrandingKey = (req, file, cb) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname) || '';
  const tenant = (req.tenant?.code || 'tenant').replace(/[^a-z0-9_-]/gi, '');
  const type = (req.query.type || req.body.type || 'asset').replace(/[^a-z0-9_-]/gi, '');
  cb(null, `branding/${tenant}/${type}-${uniqueSuffix}${ext}`);
};
const brandingUploader = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname, tenant: req.tenant?.code || 'unknown' }),
    key: buildBrandingKey,
  }),
  fileFilter: brandingImageFilter,
  limits: { fileSize: 4 * 1024 * 1024 },
});

// Wrap a multer middleware so multer errors come back as clean 400 JSON.
const handleUploadError = (mw) => (req, res, next) =>
  mw(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }
    next();
  });

/** Delete an object from S3 by key (best-effort). */
const deleteFileFromS3 = async (fileKey) => {
  if (!fileKey) return { success: true };
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey }));
    return { success: true };
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    return { success: false, error: error.message };
  }
};

/** Generate a short-lived signed GET URL for a stored object. */
const getSignedUrlForFile = async (fileKey, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: fileKey });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

/** Upload an in-memory buffer (e.g. a generated certificate PDF) and return its key. */
const uploadBufferToS3 = async (buffer, key, contentType = 'application/octet-stream') => {
  await s3Client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }),
  );
  return key;
};

module.exports = {
  uploadLessonFile: handleUploadError(lessonUploader.single('file')),
  uploadCourseCover: handleUploadError(coverUploader.single('coverImage')),
  uploadUserAvatar: handleUploadError(avatarUploader.single('avatar')),
  uploadBrandingAsset: handleUploadError(brandingUploader.single('file')),
  deleteFileFromS3,
  getSignedUrl: getSignedUrlForFile,
  uploadBufferToS3,
  BUCKET,
};
