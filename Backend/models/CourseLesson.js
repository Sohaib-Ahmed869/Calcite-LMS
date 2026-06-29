const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseLessonSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true, index: true },

    title: { type: String, required: true, trim: true },
    description: String,

    contentType: {
      type: String,
      enum: ['video', 'pdf', 'document', 'presentation', 'audio', 'image', 'link', 'text'],
      default: 'document',
    },

    // Uploaded file (S3)
    fileUrl: String,
    fileKey: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,

    // External link (YouTube / external video / web resource)
    externalUrl: String,

    // Inline rich-text lesson
    textContent: String,

    duration: { type: Number, default: 0 }, // seconds (video/audio)

    displayOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    isPreview: { type: Boolean, default: false },

    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

courseLessonSchema.index({ moduleId: 1, displayOrder: 1 });
courseLessonSchema.index({ courseId: 1, isPublished: 1 });

module.exports = mongoose.model('CourseLesson', courseLessonSchema);
