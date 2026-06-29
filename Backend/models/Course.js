const mongoose = require('mongoose');
const { Schema } = mongoose;
const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    summary: String,

    coverImageUrl: String,
    coverImageKey: String, // S3 key for deletion/management

    category: String,
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    publishedAt: Date,

    displayOrder: { type: Number, default: 0 },
    tags: [String],

    totalLessons: { type: Number, default: 0 }, // published lessons; maintained server-side

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

courseSchema.index({ status: 1 });
courseSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Course', courseSchema);
