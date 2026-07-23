const prisma = require('../config/db');

// GET /api/events
async function getEvents(req, res) {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } }, // Only upcoming events
    include: {
      creator: { select: { id: true, name: true, photos: { select: { url: true } } } },
      attendees: { select: { userId: true } },
      community: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  });

  const formatted = events.map((e) => ({
    ...e,
    attendeeCount: e.attendees.length,
    isAttending: e.attendees.some((a) => a.userId === req.userId),
  }));

  res.json({ events: formatted });
}

// POST /api/events
async function createEvent(req, res) {
  const { title, description, date, location, maxAttendees, communityId } = req.body;
  const event = await prisma.event.create({
    data: {
      title,
      description,
      date: new Date(date),
      location,
      maxAttendees,
      creatorId: req.userId,
      communityId: communityId || null,
      attendees: { create: { userId: req.userId, status: 'going' } }, // Creator is automatically attending
    },
  });
  res.status(201).json({ event });
}

// POST /api/events/:id/rsvp
async function rsvpEvent(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  const existing = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId: id, userId } },
  });

  if (existing) {
    // Toggle attendance (remove if already going)
    await prisma.eventAttendee.delete({ where: { id: existing.id } });
    return res.json({ attending: false });
  }

  // Check max attendees
  const event = await prisma.event.findUnique({ where: { id }, include: { attendees: true } });
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
    return res.status(400).json({ error: 'Event is full' });
  }

  await prisma.eventAttendee.create({
    data: { eventId: id, userId, status: 'going' },
  });

  res.json({ attending: true });
}

module.exports = { getEvents, createEvent, rsvpEvent };
