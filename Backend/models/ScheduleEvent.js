const mongoose = require('mongoose');
const { Schema } = mongoose;

// An entry on the academic calendar: a class session, exam, deadline, meeting, holiday, etc.
// Optionally linked to a Course so a course's sessions can be filtered/coloured together.
const scheduleEventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,

    type: { type: String, enum: ['class', 'exam', 'assignment', 'workshop', 'meeting', 'holiday', 'other'], default: 'class' },
    status: { type: String, enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled' },

    courseId: { type: Schema.Types.ObjectId, ref: 'Course' }, // optional link to a course

    start: { type: Date, required: true },
    end: { type: Date, required: true },
    allDay: { type: Boolean, default: false },

    location: String, // room name or "Online"
    meetingUrl: String, // join link for online sessions
    instructor: String, // free-text presenter / teacher name
    color: String, // optional hex override; otherwise the client derives a colour from `type`

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

scheduleEventSchema.index({ start: 1 });
scheduleEventSchema.index({ courseId: 1 });
scheduleEventSchema.index({ type: 1 });

module.exports = mongoose.model('ScheduleEvent', scheduleEventSchema);
