const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseLessonProgressSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true },

    isCompleted: { type: Boolean, default: false },
    completedAt: Date,

    lastViewedPosition: { type: Number, default: 0 }, // resume position (seconds)
    progressSeconds: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    firstViewedAt: Date,
    lastViewedAt: Date,
  },
  { timestamps: true },
);

// One progress record per student per lesson.
courseLessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });
courseLessonProgressSchema.index({ studentId: 1, courseId: 1 });

module.exports = mongoose.model('CourseLessonProgress', courseLessonProgressSchema);
