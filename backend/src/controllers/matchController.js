const prisma = require('../config/db');
const { sendPushToUser } = require('./pushController');

// GET /api/discover - people you haven't swiped on yet, scored by compatibility + boost
// Supports query params: minAge, maxAge, gender
async function discover(req, res) {
  const userId = req.userId;
  const { minAge, maxAge, gender } = req.query;

  // 1. Get current user's interests and blocked/matched IDs to exclude
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      interests: { select: { interestId: true } },
      sentSwipes: { select: { swipedId: true } },
      receivedSwipes: { select: { swiperId: true } },
      matchesAsA: { select: { userBId: true } },
      matchesAsB: { select: { userAId: true } },
      blockedUsers: { select: { blockedId: true } },
      blockedByUsers: { select: { blockerId: true } },
    },
  });

  const myInterestIds = currentUser.interests.map((ui) => ui.interestId);
  const excludeIds = [
    userId,
    ...currentUser.sentSwipes.map((s) => s.swipedId),
    ...currentUser.receivedSwipes.map((s) => s.swiperId),
    ...currentUser.matchesAsA.map((m) => m.userBId),
    ...currentUser.matchesAsB.map((m) => m.userAId),
    ...currentUser.blockedUsers.map((b) => b.blockedId),
    ...currentUser.blockedByUsers.map((b) => b.blockerId),
  ];

  // Users I have already liked (to bypass their incognito mode)
  const likedIds = currentUser.sentSwipes
    .filter((s) => !excludeIds.includes(s.swipedId) || true) // keep all for incognito check
    .map((s) => s.swipedId);

  // Date range for age filter
  const now = new Date();
  const minDob = maxAge ? new Date(now.getFullYear() - Number(maxAge) - 1, 1, 1) : new Date(1900, 1, 1);
  const maxDob = minAge ? new Date(now.getFullYear() - Number(minAge), 1, 1) : new Date();

  // 2. Fetch candidates with filters
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      isActive: true,
      dob: { gte: minDob, lte: maxDob },
      ...(gender && { gender: gender }),
      // Incognito: hide them UNLESS I have already liked them
      OR: [
        { isIncognito: false },
        { id: { in: likedIds } },
      ],
    },
    include: {
      photos: { where: { isProfilePic: true }, take: 1, select: { url: true } },
      interests: { include: { interest: true } },
    },
    take: 20,
  });

  // 3. Calculate Compatibility Score & Apply Boost
  const scoredCandidates = candidates.map((candidate) => {
    let score = 0;

    const candidateInterestIds = candidate.interests.map((ui) => ui.interestId);
    const sharedInterests = myInterestIds.filter((id) => candidateInterestIds.includes(id));
    score += sharedInterests.length * 10;

    if (candidate.boostedUntil && candidate.boostedUntil > now) {
      score += 50;
    }

    return {
      id: candidate.id,
      name: candidate.name,
      bio: candidate.bio,
      location: candidate.location,
      dob: candidate.dob,
      photos: candidate.photos,
      interests: candidate.interests.map((ui) => ui.interest.name),
      score,
      sharedInterests: sharedInterests.length,
    };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  return res.json({ candidates: scoredCandidates });
}

// POST /api/swipe { swipedId, direction, isSuperLike? }
async function swipe(req, res) {
  const swiperId = req.userId;
  const { swipedId, direction, isSuperLike } = req.body;

  if (!swipedId || !['LIKE', 'PASS'].includes(direction)) {
    return res.status(400).json({ error: 'swipedId and a valid direction are required' });
  }
  if (swipedId === swiperId) {
    return res.status(400).json({ error: 'You cannot swipe on yourself' });
  }

  // Daily swipe limit for free users (50/day)
  const swiper = await prisma.user.findUnique({ where: { id: swiperId } });
  if (!swiper.isPremium) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailySwipes = await prisma.swipe.count({
      where: { swiperId, createdAt: { gte: todayStart } },
    });
    if (dailySwipes >= 50) {
      return res.status(403).json({ error: 'Daily swipe limit reached. Upgrade to Premium!' });
    }
  }

  // Super Like limits
  if (direction === 'LIKE' && isSuperLike) {
    const limit = swiper.isPremium ? 5 : 1;
    if (swiper.superLikesUsed >= limit) {
      return res.status(400).json({ error: 'Super like limit reached. Upgrade to Premium!' });
    }
  }

  const swipeRecord = await prisma.swipe.upsert({
    where: { swiperId_swipedId: { swiperId, swipedId } },
    update: { direction, isSuperLike: direction === 'LIKE' ? (isSuperLike || false) : false },
    create: { swiperId, swipedId, direction, isSuperLike: direction === 'LIKE' ? (isSuperLike || false) : false },
  });

  if (direction === 'LIKE' && isSuperLike) {
    await prisma.user.update({
      where: { id: swiperId },
      data: { superLikesUsed: { increment: 1 } },
    });
  }

  let match = null;

  if (direction === 'LIKE') {
    const reciprocal = await prisma.swipe.findUnique({
      where: { swiperId_swipedId: { swiperId: swipedId, swipedId: swiperId } },
    });

    if (reciprocal && reciprocal.direction === 'LIKE') {
      const [userAId, userBId] = [swiperId, swipedId].sort();

      const conversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: { create: [{ userId: userAId }, { userId: userBId }] },
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

      // Push notifications for the match
      const otherA = await prisma.user.findUnique({ where: { id: userBId }, select: { name: true } });
      const otherB = await prisma.user.findUnique({ where: { id: userAId }, select: { name: true } });
      sendPushToUser(userAId, "It's a Match!", `You and ${otherA?.name || 'someone'} matched`, '/matches');
      sendPushToUser(userBId, "It's a Match!", `You and ${otherB?.name || 'someone'} matched`, '/matches');
    }
  }

  return res.json({ swipe: swipeRecord, matched: !!match, match });
}

// POST /api/swipe/undo - rewind last swipe
async function undoSwipe(req, res) {
  const userId = req.userId;

  const lastSwipe = await prisma.swipe.findFirst({
    where: { swiperId: userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastSwipe) {
    return res.status(404).json({ error: 'No swipes to undo' });
  }

  await prisma.swipe.delete({ where: { id: lastSwipe.id } });
  return res.json({ success: true, undoneSwipe: lastSwipe });
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

module.exports = { discover, swipe, undoSwipe, getMatches };
