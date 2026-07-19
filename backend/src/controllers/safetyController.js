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

module.exports = { reportUser, blockUser, unblockUser, getBlockedUsers };
