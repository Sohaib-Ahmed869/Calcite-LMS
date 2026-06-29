const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { uploadsDir } = require('../config/brandingConfig');

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const type = (req.query.type || req.body.type || 'asset').replace(/[^a-z0-9_-]/gi, '');
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${req.tenant?.code || 'tenant'}-${type}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = /^image\/(png|jpe?g|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.mimetype);
  cb(ok ? null : new Error('Only image files are allowed'), ok);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
});

module.exports = { upload };
