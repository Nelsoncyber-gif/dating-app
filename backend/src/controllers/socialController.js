const prisma = require('../config/db');

// GET /api/social/matches
async function getMatches(req, res) {
  const userId = req.userId;
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { select: { id: true, name: true, photos: { select: { url: true, isProfilePic: true } } } },
      userB: { select: { id: true, name: true, photos: { select: { url: true, isProfilePic: true } } } },
      conversation: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Format to return the "other" user in the match
  const formattedMatches = matches.map((m) => {
    const otherUser = m.userAId === userId ? m.userB : m.userA;
    return {
      matchId: m.id,
      user: otherUser,
      conversationId: m.conversation?.id || null,
    };
  });

  res.json({ matches: formattedMatches });
}

// GET /api/social/pending
async function getPendingLikes(req, res) {
  const userId = req.userId;

  // Find users I liked, but who haven't liked me back (no match exists)
  const pending = await prisma.swipe.findMany({
    where: { swiperId: userId, direction: 'LIKE' },
    include: {
      swiped: { select: { id: true, name: true, photos: { select: { url: true, isProfilePic: true } } } },
    },
  });

  // Filter out ones that already became matches
  const myMatchIds = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  const matchedIds = new Set(myMatchIds.flatMap((m) => [m.userAId, m.userBId]));

  const pendingUsers = pending
    .filter((p) => !matchedIds.has(p.swipedId))
    .map((p) => p.swiped);

  res.json({ pending: pendingUsers });
}

// GET /api/social/calls
async function getCallLogs(req, res) {
  const userId = req.userId;
  const logs = await prisma.callLog.findMany({
    where: { OR: [{ callerId: userId }, { receiverId: userId }] },
    include: {
      caller: { select: { id: true, name: true, photos: { select: { url: true, isProfilePic: true } } } },
      receiver: { select: { id: true, name: true, photos: { select: { url: true, isProfilePic: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedLogs = logs.map((log) => {
    const otherUser = log.callerId === userId ? log.receiver : log.caller;
    const isIncoming = log.receiverId === userId;
    return {
      id: log.id,
      user: otherUser,
      type: log.type,
      status: log.status,
      duration: log.duration,
      isIncoming,
      createdAt: log.createdAt,
    };
  });

  res.json({ logs: formattedLogs });
}

// GET /api/social/likes - see who liked you
async function getMyLikes(req, res) {
  const userId = req.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const likes = await prisma.swipe.findMany({
    where: { swipedId: userId, direction: 'LIKE' },
    include: {
      swiper: {
        select: {
          id: true,
          name: true,
          photos: { select: { url: true, isProfilePic: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // If not premium, blur the photos
  const formattedLikes = likes.map((l) => ({
    id: l.swiper.id,
    name: l.swiper.name,
    photos: user.isPremium
      ? l.swiper.photos
      : l.swiper.photos.map((p) => ({ ...p, url: p.url + '?q=10&blur=50' })),
    isPremium: user.isPremium,
  }));

  res.json({ likes: formattedLikes });
}

module.exports = { getMatches, getPendingLikes, getCallLogs, getMyLikes };
