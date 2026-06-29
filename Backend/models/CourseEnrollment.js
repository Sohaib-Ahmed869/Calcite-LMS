const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseEnrollmentSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: { type: String, enum: ['active', 'completed', 'suspended', 'withdrawn'], default: 'active' },

    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    completedLessons: { type: Number, default: 0 },

    enrolledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: Date,
    lastAccessedAt: Date,
  },
  { timestamps: true },
);

// One enrolment per student per course.
courseEnrollmentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('CourseEnrollment', courseEnrollmentSchema);
