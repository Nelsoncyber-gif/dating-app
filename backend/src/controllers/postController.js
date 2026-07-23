const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { moderateText, moderateImage } = require('../services/moderationService');
const { sendPushToUser } = require('./pushController');

// GET /api/posts - global timeline feed (paginated)
async function getFeed(req, res) {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = 20;

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      user: { select: { id: true, name: true, photos: { where: { isProfilePic: true }, take: 1 } } },
      likes: true,
      comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  return res.json({ posts });
}

// GET /api/posts/user/:userId - one user's timeline
async function getUserPosts(req, res) {
  const { userId } = req.params;
  const posts = await prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, photos: { where: { isProfilePic: true }, take: 1 } } },
      likes: true,
      comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  return res.json({ posts });
}

// POST /api/posts { content } + optional image file (multipart, field name "image")
async function createPost(req, res) {
  const userId = req.userId;
  const { content } = req.body;

  if (!content && !req.file) {
    return res.status(400).json({ error: 'A post needs text content or an image' });
  }

  // Moderate text content before saving
  if (content) {
    const textCheck = await moderateText(content);
    if (!textCheck.isSafe) {
      return res.status(400).json({ error: textCheck.reason });
    }
  }

  let imageUrl = null;
  let mediaType = 'image';
  if (req.file) {
    const isVideo = req.file.mimetype.startsWith('video/');
    if (isVideo) mediaType = 'video';

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'dating-app/posts', resource_type: isVideo ? 'video' : 'image' },
        (err, result) => (err ? reject(err) : resolve(result)),
      );
      stream.end(req.file.buffer);
    });
    imageUrl = uploadResult.secure_url;

    // Moderate image content (skip for videos for now)
    if (!isVideo) {
      const imageCheck = await moderateImage(imageUrl);
      if (!imageCheck.isSafe) {
        // Image already uploaded to Cloudinary — could delete here if needed
        return res.status(400).json({ error: imageCheck.reason });
      }
    }
  }

  const post = await prisma.post.create({
    data: { userId, content: content || null, imageUrl, mediaType },
    include: { user: { select: { id: true, name: true } } },
  });

  return res.status(201).json({ post });
}

// POST /api/posts/:id/like - toggle like
async function toggleLike(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId: id, userId } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    return res.json({ liked: false });
  }

  await prisma.postLike.create({ data: { postId: id, userId } });

  const post = await prisma.post.findUnique({ where: { id } });
  if (post && post.userId !== userId) {
    await prisma.notification.create({
      data: { userId: post.userId, type: 'POST_LIKE', payload: { postId: id, byUserId: userId } },
    });
    req.app.locals.io.to(`user:${post.userId}`).emit('notification', { type: 'POST_LIKE', postId: id });
    const liker = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    sendPushToUser(post.userId, 'New like', `${liker?.name || 'Someone'} liked your post`, '/timeline');
  }

  return res.json({ liked: true });
}

// POST /api/posts/:id/comments { content }
async function addComment(req, res) {
  const { id } = req.params;
  const userId = req.userId;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  const comment = await prisma.postComment.create({
    data: { postId: id, userId, content },
    include: { user: { select: { id: true, name: true } } },
  });

  const post = await prisma.post.findUnique({ where: { id } });
  if (post && post.userId !== userId) {
    await prisma.notification.create({
      data: { userId: post.userId, type: 'POST_COMMENT', payload: { postId: id, byUserId: userId } },
    });
    req.app.locals.io.to(`user:${post.userId}`).emit('notification', { type: 'POST_COMMENT', postId: id });
    const commenter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    sendPushToUser(post.userId, 'New comment', `${commenter?.name || 'Someone'} commented on your post`, '/timeline');
  }

  return res.status(201).json({ comment });
}

// DELETE /api/posts/:id
async function deletePost(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (post.userId !== userId) {
    return res.status(403).json({ error: 'You can only delete your own posts' });
  }

  await prisma.post.delete({ where: { id } });
  return res.json({ deleted: true });
}

module.exports = { getFeed, getUserPosts, createPost, toggleLike, addComment, deletePost };
