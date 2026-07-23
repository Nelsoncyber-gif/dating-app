const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getEvents, createEvent, rsvpEvent } = require('../controllers/eventController');

router.get('/', requireAuth, getEvents);
router.post('/', requireAuth, createEvent);
router.post('/:id/rsvp', requireAuth, rsvpEvent);

module.exports = router;
