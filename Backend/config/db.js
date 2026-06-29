const mongoose = require('mongoose');
const MODELS_TO_SYNC = [
  '../models/User',
  '../models/Course',
  '../models/CourseModule',
  '../models/CourseLesson',
  '../models/CourseEnrollment',
  '../models/CourseLessonProgress',
  '../models/CourseNote',
  '../models/CourseBookmark',
  '../models/CourseReview',
  '../models/CourseCertificate',
];

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calcite_courses';
    await mongoose.connect(uri);
    console.log(`MongoDB Connected → ${mongoose.connection.name}`);

    for (const p of MODELS_TO_SYNC) {
      try {
        const Model = require(p);
        await Model.syncIndexes();
      } catch (idxErr) {
        console.warn(`[syncIndexes] ${p} failed:`, idxErr.message);
      }
    }
    return true;
  } catch (error) {
    // Non-fatal: the branding subsystem (JSON store) doesn't need Mongo, so the unified server still
    // boots and serves branding even if Mongo is unreachable. Course routes will 500 until it's up.
    console.warn('MongoDB connection failed — course features disabled until it is available:', error.message);
    return false;
  }
};

module.exports = { connectDB };
