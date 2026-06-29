const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseBookmarkSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true },
    title: { type: String, required: true },
    timestamp: { type: Number, default: 0 }, // video position (seconds)
  },
  { timestamps: true },
);

courseBookmarkSchema.index({ studentId: 1, lessonId: 1 });

module.exports = mongoose.model('CourseBookmark', courseBookmarkSchema);
