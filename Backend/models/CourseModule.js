const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseModuleSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: String,
    displayOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

courseModuleSchema.index({ courseId: 1, displayOrder: 1 });

module.exports = mongoose.model('CourseModule', courseModuleSchema);
