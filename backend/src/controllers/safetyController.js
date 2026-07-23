const prisma = require('../config/db');

// POST /api/safety/report { reportedId, reason }
async function reportUser(req, res) {
  const reporterId = req.userId;
  const { reportedId, reason } = req.body;

  if (!reportedId || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'reportedId and reason are required' });
  }
  if (reportedId === reporterId) {
    return res.status(400).json({ error: 'You cannot report yourself' });
  }

  const targetExists = await prisma.user.findUnique({ where: { id: reportedId } });
  if (!targetExists) return res.status(404).json({ error: 'User not found' });

  const report = await prisma.report.create({
    data: { reporterId, reportedId, reason },
  });

  return res.status(201).json({ report });
}

// POST /api/safety/block { blockedId }
async function blockUser(req, res) {
  const blockerId = req.userId;
  const { blockedId } = req.body;

  if (!blockedId) return res.status(400).json({ error: 'blockedId is required' });
  if (blockedId === blockerId) return res.status(400).json({ error: 'You cannot block yourself' });

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (existing) return res.status(409).json({ error: 'User already blocked' });

  await prisma.block.create({ data: { blockerId, blockedId } });

  // Also remove any existing match between the two, so blocking severs the connection cleanly
  await prisma.match.deleteMany({
    where: {
      OR: [
        { userAId: blockerId, userBId: blockedId },
        { userAId: blockedId, userBId: blockerId },
      ],
    },
  });

  return res.status(201).json({ blocked: true });
}

// DELETE /api/safety/block/:blockedId
async function unblockUser(req, res) {
  const blockerId = req.userId;
  const { blockedId } = req.params;

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (!existing) return res.status(404).json({ error: 'Block not found' });

  await prisma.block.delete({ where: { id: existing.id } });
  return res.json({ unblocked: true });
}

// GET /api/safety/blocked - list who you've blocked
async function getBlockedUsers(req, res) {
  const blockerId = req.userId;
  const blocks = await prisma.block.findMany({
    where: { blockerId },
    include: { blocked: { select: { id: true, name: true } } },
  });
  return res.json({ blocked: blocks.map((b) => b.blocked) });
}

// POST /api/safety/emergency-contact { name, phone, email? }
async function setEmergencyContact(req, res) {
  const { name, phone, email } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  const contact = await prisma.emergencyContact.upsert({
    where: { userId: req.userId },
    update: { name, phone, email: email || null },
    create: { userId: req.userId, name, phone, email: email || null },
  });

  return res.json({ contact });
}

// GET /api/safety/emergency-contact
async function getEmergencyContact(req, res) {
  const contact = await prisma.emergencyContact.findUnique({
    where: { userId: req.userId },
  });
  return res.json({ contact });
}

// POST /api/safety/safety-check/start { durationMinutes, location? }
async function startSafetyCheck(req, res) {
  const { durationMinutes, location } = req.body;
  if (!durationMinutes || durationMinutes < 1) {
    return res.status(400).json({ error: 'A valid duration in minutes is required' });
  }

  const deadline = new Date(Date.now() + durationMinutes * 60000);

  // Remove any existing safety check first (userId is unique)
  await prisma.safetyCheck.deleteMany({ where: { userId: req.userId } });

  const check = await prisma.safetyCheck.create({
    data: { userId: req.userId, checkInTime: new Date(), deadline, location: location || null },
  });

  return res.json({ check });
}

// POST /api/safety/safety-check/check-in
async function checkIn(req, res) {
  await prisma.safetyCheck.deleteMany({ where: { userId: req.userId } });
  return res.json({ success: true });
}

module.exports = { reportUser, blockUser, unblockUser, getBlockedUsers, setEmergencyContact, getEmergencyContact, startSafetyCheck, checkIn };
