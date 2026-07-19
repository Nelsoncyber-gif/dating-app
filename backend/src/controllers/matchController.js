const prisma = require('../config/db');

// GET /api/discover - people you haven't swiped on yet
async function discover(req, res) {
  const userId = req.userId;

  const alreadySwiped = await prisma.swipe.findMany({
    where: { swiperId: userId },
    select: { swipedId: true },
  });
  const excludeIds = alreadySwiped.map((s) => s.swipedId);
  excludeIds.push(userId); // never show yourself

  const blocked = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
  });
  blocked.forEach((b) => {
    excludeIds.push(b.blockerId === userId ? b.blockedId : b.blockerId);
  });

  const candidates = await prisma.user.findMany({
    where: { id: { notIn: excludeIds }, isActive: true },
    select: {
      id: true, name: true, bio: true, location: true, dob: true,
      photos: { where: { isProfilePic: true }, take: 1 },
    },
    take: 20,
  });

  return res.json({ candidates });
}

// POST /api/swipe { swipedId, direction }
async function swipe(req, res) {
  const swiperId = req.userId;
  const { swipedId, direction } = req.body;

  if (!swipedId || !['LIKE', 'PASS'].includes(direction)) {
    return res.status(400).json({ error: 'swipedId and a valid direction are required' });
  }
  if (swipedId === swiperId) {
    return res.status(400).json({ error: 'You cannot swipe on yourself' });
  }

  await prisma.swipe.upsert({
    where: { swiperId_swipedId: { swiperId, swipedId } },
    update: { direction },
    create: { swiperId, swipedId, direction },
  });

  let match = null;

  if (direction === 'LIKE') {
    const reciprocal = await prisma.swipe.findUnique({
      where: { swiperId_swipedId: { swiperId: swipedId, swipedId: swiperId } },
    });

    if (reciprocal && reciprocal.direction === 'LIKE') {
      // It's a match! Order ids consistently to satisfy the unique constraint.
      const [userAId, userBId] = [swiperId, swipedId].sort();

      const conversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [{ userId: userAId }, { userId: userBId }],
          },
        },
      });

      match = await prisma.match.create({
        data: { userAId, userBId, conversationId: conversation.id },
        include: { userA: true, userB: true },
      });

      await prisma.notification.createMany({
        data: [
          { userId: userAId, type: 'MATCH', payload: { matchId: match.id } },
          { userId: userBId, type: 'MATCH', payload: { matchId: match.id } },
        ],
      });

      const io = req.app.locals.io;
      io.to(`user:${userAId}`).emit('notification', { type: 'MATCH', matchId: match.id });
      io.to(`user:${userBId}`).emit('notification', { type: 'MATCH', matchId: match.id });
    }
  }

  return res.json({ matched: !!match, match });
}

// GET /api/matches
async function getMatches(req, res) {
  const userId = req.userId;
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { select: { id: true, name: true, photos: true } },
      userB: { select: { id: true, name: true, photos: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ matches });
}

module.exports = { discover, swipe, getMatches };
