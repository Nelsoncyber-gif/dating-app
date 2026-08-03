const prisma = require('../config/db');
const { sendPushToUser } = require('./pushController');

// Haversine distance in km between two lat/lng points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/discover - people you haven't matched/blocked/actively-liked yet
// Supports query params: minAge, maxAge, gender
// Passed profiles and incoming likes are allowed back into the pool so existing
// users always see candidates instead of an empty grid.
async function discover(req, res) {
  const userId = req.userId;
  const { minAge, maxAge, gender } = req.query;

  // 1. Get current user's data including coordinates and interests
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      interests: { select: { interestId: true } },
      sentSwipes: { where: { direction: 'LIKE' }, select: { swipedId: true } },
      matchesAsA: { select: { userBId: true } },
      matchesAsB: { select: { userAId: true } },
      blockedUsers: { select: { blockedId: true } },
      blockedByUsers: { select: { blockerId: true } },
    },
  });

  const myInterestIds = currentUser.interests.map((ui) => ui.interestId);
  const myAge = Math.floor(
    (Date.now() - new Date(currentUser.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );

  // Only exclude: self, matches, blocks, and users I've actively LIKED
  // Passed profiles are NOT excluded — they recycle back into the grid
  const likedIds = currentUser.sentSwipes.map((s) => s.swipedId);
  const excludeIds = [
    userId,
    ...likedIds,
    ...currentUser.matchesAsA.map((m) => m.userBId),
    ...currentUser.matchesAsB.map((m) => m.userAId),
    ...currentUser.blockedUsers.map((b) => b.blockedId),
    ...currentUser.blockedByUsers.map((b) => b.blockerId),
  ];

  // Date range for age filter
  const now = new Date();
  const minDob = maxAge ? new Date(now.getFullYear() - Number(maxAge) - 1, 1, 1) : new Date(1900, 1, 1);
  const maxDob = minAge ? new Date(now.getFullYear() - Number(minAge), 1, 1) : new Date();

  // 2. Fetch candidates — return ALL photos, coordinates, interests
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      isActive: true,
      dob: { gte: minDob, lte: maxDob },
      ...(gender && { gender: gender }),
    },
    include: {
      photos: { select: { url: true, isProfilePic: true } },
      interests: { include: { interest: true } },
      profilePrompts: { select: { question: true, answer: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      videoIntro: { select: { videoUrl: true } },
    },
    take: 50,
  });

  // 3. Calculate Compatibility Score, Distance & Apply Boost
  const scoredCandidates = candidates.map((candidate) => {
    const candidateInterestIds = candidate.interests.map((ui) => ui.interestId);
    const sharedInterestNames = myInterestIds
      .filter((id) => candidateInterestIds.includes(id))
      .map((id) => candidate.interests.find((ui) => ui.interestId === id)?.interest?.name)
      .filter(Boolean);

    // Compatibility: weighted score 0-100
    let compatScore = 0;
    // Interest overlap (up to 50 points)
    const interestOverlap = sharedInterestNames.length;
    const interestUnion = new Set([...myInterestIds, ...candidateInterestIds]).size;
    if (interestUnion > 0) {
      compatScore += (interestOverlap / interestUnion) * 50;
    }
    // Age proximity (up to 20 points — closer age = higher score)
    const candidateAge = Math.floor(
      (Date.now() - new Date(candidate.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );
    const ageDiff = Math.abs(myAge - candidateAge);
    compatScore += Math.max(0, 20 - ageDiff * 4);
    // Profile completeness bonus (up to 15 points)
    if (candidate.bio) compatScore += 5;
    if (candidate.occupation) compatScore += 3;
    if (candidate.education) compatScore += 3;
    if (candidate.photos.length > 1) compatScore += 4;
    // Same location bonus (up to 15 points)
    if (currentUser.location && candidate.location && currentUser.location === candidate.location) {
      compatScore += 15;
    }
    const compatibility = Math.min(Math.round(compatScore), 100);

    // Distance (km)
    let distance = null;
    if (currentUser.latitude != null && currentUser.longitude != null &&
        candidate.latitude != null && candidate.longitude != null) {
      distance = Math.round(
        haversineDistance(currentUser.latitude, currentUser.longitude, candidate.latitude, candidate.longitude)
      );
    }

    // Boost / scoring (for sort order)
    let score = compatibility;
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
      sharedInterests: interestOverlap,
      sharedInterestNames,
      compatibility,
      distance,
      score,
      profilePrompts: candidate.profilePrompts,
      videoIntro: candidate.videoIntro,
    };
  });

  // Sort: boosted first, then by compatibility
  scoredCandidates.sort((a, b) => b.score - a.score);

  return res.json({ candidates: scoredCandidates });
}

// Basic UUID format check
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/swipe { swipedId, direction, isSuperLike? }
async function swipe(req, res) {
  const swiperId = req.userId;
  const { swipedId, direction, isSuperLike } = req.body;

  if (!swipedId || !['LIKE', 'PASS'].includes(direction)) {
    return res.status(400).json({ error: 'swipedId and a valid direction are required' });
  }
  if (!UUID_RE.test(swipedId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
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

// GET /api/matches/:matchId/milestones
async function getMilestones(req, res) {
  const { matchId } = req.params;
  const userId = req.userId;

  // Verify user is part of this match
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const milestones = await prisma.milestone.findMany({
    where: { matchId },
    orderBy: { reachedAt: 'asc' },
  });

  return res.json({ milestones, matchCreatedAt: match.createdAt });
}

// POST /api/matches/:matchId/milestones (for time-based milestones)
async function createMilestone(req, res) {
  const { matchId } = req.params;
  const { type } = req.body;
  const userId = req.userId;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const validTypes = ['one_week', 'one_month'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid milestone type' });
  }

  const milestone = await prisma.milestone.upsert({
    where: { matchId_type: { matchId, type } },
    update: {},
    create: { matchId, type },
  });

  return res.json({ milestone });
}

// GET /api/discover/daily-pick - returns 1 highly-compatible candidate per day
async function getDailyPick(req, res) {
  const userId = req.userId;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      interests: { select: { interestId: true } },
      sentSwipes: { where: { direction: 'LIKE' }, select: { swipedId: true } },
      matchesAsA: { select: { userBId: true } },
      matchesAsB: { select: { userAId: true } },
      blockedUsers: { select: { blockedId: true } },
      blockedByUsers: { select: { blockerId: true } },
    },
  });

  // Check if we already have a daily pick for today
  if (currentUser.lastDailyPickAt) {
    const lastPick = new Date(currentUser.lastDailyPickAt);
    const now = new Date();
    const sameDay =
      lastPick.getFullYear() === now.getFullYear() &&
      lastPick.getMonth() === now.getMonth() &&
      lastPick.getDate() === now.getDate();
    if (sameDay) {
      // Return the same pick - we need to store which user was picked
      // For simplicity, re-query with the same logic but limited to 1
    }
  }

  const myInterestIds = currentUser.interests.map((ui) => ui.interestId);
  const myAge = Math.floor(
    (Date.now() - new Date(currentUser.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );

  // Only exclude: self, matches, blocks, and users I've actively LIKED
  const likedIds = currentUser.sentSwipes.map((s) => s.swipedId);
  const excludeIds = [
    userId,
    ...likedIds,
    ...currentUser.matchesAsA.map((m) => m.userBId),
    ...currentUser.matchesAsB.map((m) => m.userAId),
    ...currentUser.blockedUsers.map((b) => b.blockedId),
    ...currentUser.blockedByUsers.map((b) => b.blockerId),
  ];

  const now = new Date();
  const minDob = new Date(now.getFullYear() - 40, 1, 1);
  const maxDob = new Date(now.getFullYear() - 18, 1, 1);

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      isActive: true,
      dob: { gte: minDob, lte: maxDob },
    },
    include: {
      photos: { select: { url: true, isProfilePic: true } },
      interests: { include: { interest: true } },
      profilePrompts: { select: { question: true, answer: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      videoIntro: { select: { videoUrl: true } },
    },
    take: 50,
  });

  if (candidates.length === 0) {
    return res.json({ dailyPick: null });
  }

  // Score candidates
  const scored = candidates.map((candidate) => {
    const candidateInterestIds = candidate.interests.map((ui) => ui.interestId);
    const sharedInterestNames = myInterestIds
      .filter((id) => candidateInterestIds.includes(id))
      .map((id) => candidate.interests.find((ui) => ui.interestId === id)?.interest?.name)
      .filter(Boolean);

    let compatScore = 0;
    const interestOverlap = sharedInterestNames.length;
    const interestUnion = new Set([...myInterestIds, ...candidateInterestIds]).size;
    if (interestUnion > 0) compatScore += (interestOverlap / interestUnion) * 50;

    const candidateAge = Math.floor(
      (Date.now() - new Date(candidate.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );
    const ageDiff = Math.abs(myAge - candidateAge);
    compatScore += Math.max(0, 20 - ageDiff * 4);
    if (candidate.bio) compatScore += 5;
    if (candidate.occupation) compatScore += 3;
    if (candidate.education) compatScore += 3;
    if (candidate.photos.length > 1) compatScore += 4;
    if (currentUser.location && candidate.location && currentUser.location === candidate.location) {
      compatScore += 15;
    }
    const compatibility = Math.min(Math.round(compatScore), 100);

    let distance = null;
    if (currentUser.latitude != null && currentUser.longitude != null &&
        candidate.latitude != null && candidate.longitude != null) {
      distance = Math.round(
        haversineDistance(currentUser.latitude, currentUser.longitude, candidate.latitude, candidate.longitude)
      );
    }

    return {
      id: candidate.id,
      name: candidate.name,
      bio: candidate.bio,
      location: candidate.location,
      dob: candidate.dob,
      photos: candidate.photos,
      interests: candidate.interests.map((ui) => ui.interest.name),
      sharedInterests: interestOverlap,
      sharedInterestNames,
      compatibility,
      distance,
      score: compatibility,
      profilePrompts: candidate.profilePrompts,
      videoIntro: candidate.videoIntro,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick the top candidate
  const pick = scored[0];

  // Update lastDailyPickAt
  await prisma.user.update({
    where: { id: userId },
    data: { lastDailyPickAt: new Date() },
  });

  return res.json({ dailyPick: pick });
}

// GET /api/discover/search?q=query - Search users by name
async function searchUsers(req, res) {
  const userId = req.userId;
  const { q } = req.query;

  if (!q || q.trim().length < 1) {
    return res.json({ results: [] });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      blockedUsers: { select: { blockedId: true } },
      blockedByUsers: { select: { blockerId: true } },
    },
  });

  const excludeIds = [
    userId,
    ...currentUser.blockedUsers.map((b) => b.blockedId),
    ...currentUser.blockedByUsers.map((b) => b.blockerId),
  ];

  const results = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      isActive: true,
      name: { contains: q.trim(), mode: 'insensitive' },
    },
    include: {
      photos: { select: { url: true, isProfilePic: true } },
    },
    take: 20,
  });

  const formatted = results.map((u) => ({
    id: u.id,
    name: u.name,
    bio: u.bio,
    location: u.location,
    photos: u.photos,
  }));

  return res.json({ results: formatted });
}

module.exports = { discover, swipe, undoSwipe, getMatches, getMilestones, createMilestone, getDailyPick, searchUsers };
