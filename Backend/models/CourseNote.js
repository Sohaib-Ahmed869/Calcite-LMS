const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseNoteSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true },
    noteText: { type: String, required: true },
    timestamp: { type: Number, default: null }, // video position (seconds); null for non-video
  },
  { timestamps: true },
);

courseNoteSchema.index({ studentId: 1, lessonId: 1 });

module.exports = mongoose.model('CourseNote', courseNoteSchema);
