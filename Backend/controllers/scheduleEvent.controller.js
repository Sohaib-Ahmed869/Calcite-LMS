const ScheduleEvent = require('../models/ScheduleEvent');
const { ok, fail, isValidId, wrap } = require('../utils/http');

const TYPES = ['class', 'exam', 'assignment', 'workshop', 'meeting', 'holiday', 'other'];
const STATUSES = ['scheduled', 'cancelled', 'completed'];

// POST /api/schedule (admin) — create a calendar event.
const createEvent = wrap(async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.title.trim()) return fail(res, 400, 'Title is required');

  const start = b.start ? new Date(b.start) : null;
  const end = b.end ? new Date(b.end) : null;
  if (!start || Number.isNaN(start.getTime())) return fail(res, 400, 'A valid start date/time is required');
  if (!end || Number.isNaN(end.getTime())) return fail(res, 400, 'A valid end date/time is required');
  if (end < start) return fail(res, 400, 'End must be after start');
  if (b.courseId && !isValidId(b.courseId)) return fail(res, 400, 'Invalid course id');

  const event = await ScheduleEvent.create({
    title: b.title.trim(),
    description: b.description,
    type: TYPES.includes(b.type) ? b.type : 'class',
    status: STATUSES.includes(b.status) ? b.status : 'scheduled',
    courseId: b.courseId || undefined,
    start,
    end,
    allDay: !!b.allDay,
    location: b.location,
    meetingUrl: b.meetingUrl,
    instructor: b.instructor,
    color: b.color,
    createdBy: req.userId,
  });

  await event.populate('courseId', 'title');
  return ok(res, event, 201);
});

// GET /api/schedule — list with optional range / type / course / status / search filters.
// Range is an overlap test: an event shows if it starts before `to` and ends after `from`.
const listEvents = wrap(async (req, res) => {
  const { from, to, type, status, courseId, search } = req.query;
  const filter = { isActive: true };
  if (type && TYPES.includes(type)) filter.type = type;
  if (status && STATUSES.includes(status)) filter.status = status;
  if (courseId && isValidId(courseId)) filter.courseId = courseId;
  if (search && search.trim()) filter.title = { $regex: search.trim(), $options: 'i' };
  if (to) filter.start = { $lte: new Date(to) };
  if (from) filter.end = { $gte: new Date(from) };

  const events = await ScheduleEvent.find(filter).sort({ start: 1 }).populate('courseId', 'title').lean();
  return ok(res, events);
});

// GET /api/schedule/:id
const getEvent = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid event id');
  const event = await ScheduleEvent.findById(id).populate('courseId', 'title').lean();
  if (!event || event.isActive === false) return fail(res, 404, 'Event not found');
  return ok(res, event);
});

// PUT /api/schedule/:id (admin) — partial update of the provided fields.
const updateEvent = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid event id');
  const event = await ScheduleEvent.findById(id);
  if (!event || event.isActive === false) return fail(res, 404, 'Event not found');

  const b = req.body || {};
  if (b.title !== undefined) {
    if (!b.title.trim()) return fail(res, 400, 'Title cannot be empty');
    event.title = b.title.trim();
  }
  if (b.description !== undefined) event.description = b.description;
  if (b.type !== undefined && TYPES.includes(b.type)) event.type = b.type;
  if (b.status !== undefined && STATUSES.includes(b.status)) event.status = b.status;
  if (b.courseId !== undefined) {
    if (b.courseId && !isValidId(b.courseId)) return fail(res, 400, 'Invalid course id');
    event.courseId = b.courseId || undefined;
  }
  if (b.start !== undefined) {
    const d = new Date(b.start);
    if (Number.isNaN(d.getTime())) return fail(res, 400, 'Invalid start');
    event.start = d;
  }
  if (b.end !== undefined) {
    const d = new Date(b.end);
    if (Number.isNaN(d.getTime())) return fail(res, 400, 'Invalid end');
    event.end = d;
  }
  if (event.end < event.start) return fail(res, 400, 'End must be after start');
  if (b.allDay !== undefined) event.allDay = !!b.allDay;
  if (b.location !== undefined) event.location = b.location;
  if (b.meetingUrl !== undefined) event.meetingUrl = b.meetingUrl;
  if (b.instructor !== undefined) event.instructor = b.instructor;
  if (b.color !== undefined) event.color = b.color;

  await event.save();
  await event.populate('courseId', 'title');
  return ok(res, event);
});

// DELETE /api/schedule/:id (admin) — hard delete.
const deleteEvent = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, 'Invalid event id');
  const event = await ScheduleEvent.findById(id);
  if (!event) return fail(res, 404, 'Event not found');
  await event.deleteOne();
  return ok(res, { deleted: true });
});

module.exports = { createEvent, listEvents, getEvent, updateEvent, deleteEvent };
