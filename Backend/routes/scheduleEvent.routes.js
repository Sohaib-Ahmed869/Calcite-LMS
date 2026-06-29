const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/scheduleEvent.controller');

const router = express.Router();

// Reads — any authenticated user (admins build the calendar; staff/students can view it).
router.get('/schedule', c.listEvents);
router.get('/schedule/:id', c.getEvent);

// Writes — admin only.
router.post('/schedule', requireAdmin, c.createEvent);
router.put('/schedule/:id', requireAdmin, c.updateEvent);
router.delete('/schedule/:id', requireAdmin, c.deleteEvent);

module.exports = router;
