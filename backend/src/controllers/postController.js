const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');

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
    include: { likes: true, comments: true },
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

  let imageUrl = null;
  if (req.file) {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'dating-app/posts' },
        (err, result) => (err ? reject(err) : resolve(result)),
      );
      stream.end(req.file.buffer);
    });
    imageUrl = uploadResult.secure_url;
  }

  const post = await prisma.post.create({
    data: { userId, content: content || null, imageUrl },
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
  }

  return res.status(201).json({ comment });
}

module.exports = { getFeed, getUserPosts, createPost, toggleLike, addComment };
