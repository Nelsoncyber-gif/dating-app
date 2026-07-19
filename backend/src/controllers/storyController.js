const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// GET /api/stories - active (non-expired) stories, grouped by user
// Returns stories from everyone except users you've blocked/been blocked by.
async function getActiveStories(req, res) {
  const userId = req.userId;

  const blocked = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
  });
  const excludeIds = blocked.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));

  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: new Date() },
      userId: { notIn: excludeIds },
    },
    include: {
      user: { select: { id: true, name: true, photos: { where: { isProfilePic: true }, take: 1 } } },
      views: { select: { userId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group by user so the frontend can render one "bubble" per person with a stack of stories
  const grouped = {};
  for (const story of stories) {
    if (!grouped[story.userId]) {
      grouped[story.userId] = { user: story.user, stories: [] };
    }
    grouped[story.userId].stories.push({
      id: story.id,
      mediaUrl: story.mediaUrl,
      caption: story.caption,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewCount: story.views.length,
      viewedByMe: story.views.some((v) => v.userId === userId),
    });
  }

  return res.json({ storyGroups: Object.values(grouped) });
}

// GET /api/stories/user/:userId - one user's active stories (for viewing the full stack)
async function getUserStories(req, res) {
  const { userId: targetUserId } = req.params;
  const stories = await prisma.story.findMany({
    where: { userId: targetUserId, expiresAt: { gt: new Date() } },
    include: { views: true },
    orderBy: { createdAt: 'asc' },
  });
  return res.json({ stories });
}

// POST /api/stories - multipart with "media" file field + optional caption
async function createStory(req, res) {
  const userId = req.userId;
  const { caption } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'A media file (image or video) is required' });
  }

  const isVideo = req.file.mimetype.startsWith('video/');

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'dating-app/stories', resource_type: isVideo ? 'video' : 'image' },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(req.file.buffer);
  });

  const now = new Date();
  const story = await prisma.story.create({
    data: {
      userId,
      mediaUrl: uploadResult.secure_url,
      caption: caption || null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + TWENTY_FOUR_HOURS_MS),
    },
  });

  return res.status(201).json({ story });
}

// POST /api/stories/:id/view - mark a story as viewed by the current user
async function viewStory(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.expiresAt < new Date()) return res.status(410).json({ error: 'This story has expired' });

  await prisma.storyView.upsert({
    where: { storyId_userId: { storyId: id, userId } },
    update: {},
    create: { storyId: id, userId },
  });

  return res.json({ viewed: true });
}

// DELETE /api/stories/:id - let a user delete their own story early
async function deleteStory(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.userId !== userId) return res.status(403).json({ error: 'You can only delete your own stories' });

  await prisma.story.delete({ where: { id } });
  return res.json({ deleted: true });
}

module.exports = {
  getActiveStories, getUserStories, createStory, viewStory, deleteStory,
};
