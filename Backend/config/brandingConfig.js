const path = require('path');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  port: Number(process.env.PORT) || 8080,
  jwtSecret: process.env.JWT_SECRET || 'dev-super-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  defaultTenant: process.env.DEFAULT_TENANT || 'calcite',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5180,http://127.0.0.1:5180,http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  dataFile: path.join(ROOT, 'data', 'store.json'),
  uploadsDir: path.join(ROOT, 'uploads'),
  uploadsPublicPath: '/uploads',
};
