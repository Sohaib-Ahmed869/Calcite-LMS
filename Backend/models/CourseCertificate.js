const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseCertificateSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    certificateNumber: { type: String, required: true, unique: true },
    completionDate: { type: Date, required: true },
    certificateUrl: String, // PDF in S3 (stored key; served via signed URL)
    metadata: {
      courseTitle: String,
      totalHours: Number,
      achievements: [String],
    },
  },
  { timestamps: true },
);

courseCertificateSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
// (certificateNumber already has a unique index from `unique: true` above.)

module.exports = mongoose.model('CourseCertificate', courseCertificateSchema);
