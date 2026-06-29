const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseReviewSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, default: '' },
    helpful: [{ type: Schema.Types.ObjectId, ref: 'User' }], // students who marked it helpful
  },
  { timestamps: true },
);

courseReviewSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
courseReviewSchema.index({ courseId: 1 });

module.exports = mongoose.model('CourseReview', courseReviewSchema);
