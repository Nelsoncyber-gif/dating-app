const prisma = require('../config/db');

// GET /api/communities - list all communities, with membership count
async function listCommunities(req, res) {
  const communities = await prisma.community.findMany({
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ communities });
}

// GET /api/communities/:id
async function getCommunity(req, res) {
  const { id } = req.params;
  const community = await prisma.community.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!community) return res.status(404).json({ error: 'Community not found' });
  return res.json({ community });
}

// POST /api/communities { name, description }
async function createCommunity(req, res) {
  const userId = req.userId;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Community name is required' });
  }

  const community = await prisma.community.create({
    data: {
      name,
      description: description || null,
      // Creator automatically becomes the first member
      members: { create: [{ userId }] },
    },
    include: { members: true },
  });

  return res.status(201).json({ community });
}

// POST /api/communities/:id/join
async function joinCommunity(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  const community = await prisma.community.findUnique({ where: { id } });
  if (!community) return res.status(404).json({ error: 'Community not found' });

  const existing = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId: id, userId } },
  });
  if (existing) return res.status(409).json({ error: 'Already a member' });

  await prisma.communityMember.create({ data: { communityId: id, userId } });
  return res.status(201).json({ joined: true });
}

// POST /api/communities/:id/leave
async function leaveCommunity(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId: id, userId } },
  });
  if (!membership) return res.status(404).json({ error: 'Not a member of this community' });

  await prisma.communityMember.delete({ where: { id: membership.id } });
  return res.json({ left: true });
}

module.exports = { listCommunities, getCommunity, createCommunity, joinCommunity, leaveCommunity };
