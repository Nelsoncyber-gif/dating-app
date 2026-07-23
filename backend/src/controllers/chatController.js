const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');

// GET /api/conversations - all conversations for the logged-in user
async function getConversations(req, res) {
  const userId = req.userId;
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, photos: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ conversations });
}

// GET /api/conversations/:id/messages
async function getMessages(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId } },
  });
  if (!participant) return res.status(403).json({ error: 'Not a participant of this conversation' });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return res.json({ messages });
}

// POST /api/conversations/:id/messages { content }
// Also emits via Socket.IO — see src/sockets/chat.js for the realtime path.
// This REST endpoint exists as a fallback / for sending from non-socket contexts.
async function sendMessage(req, res) {
  const { id } = req.params;
  const { content } = req.body;
  const senderId = req.userId;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: senderId } },
  });
  if (!participant) return res.status(403).json({ error: 'Not a participant of this conversation' });

  const message = await prisma.message.create({
    data: { conversationId: id, senderId, content },
    include: { sender: { select: { id: true, name: true } } },
  });

  return res.status(201).json({ message });
}

// POST /api/conversations/group { name, participantIds: [] }
async function createGroupChat(req, res) {
  const creatorId = req.userId;
  const { name, participantIds } = req.body;

  if (!name || !Array.isArray(participantIds) || participantIds.length < 1) {
    return res.status(400).json({ error: 'name and at least one participantId are required' });
  }

  const allIds = [...new Set([creatorId, ...participantIds])];

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: true,
      name,
      participants: { create: allIds.map((userId) => ({ userId })) },
    },
    include: { participants: { include: { user: { select: { id: true, name: true } } } } },
  });

  return res.status(201).json({ conversation });
}

// POST /api/conversations/:id/media - upload image/video for chat messages
async function uploadMediaChat(req, res) {
  const { id } = req.params;
  const senderId = req.userId;

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: senderId } },
  });
  if (!participant) return res.status(403).json({ error: 'Not a participant of this conversation' });

  const isVideo = req.file.mimetype.startsWith('video/');
  const mediaType = isVideo ? 'video' : 'image';

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'dating-app/chat', resource_type: isVideo ? 'video' : 'image' },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(req.file.buffer);
  });

  return res.json({ url: uploadResult.secure_url, mediaType });
}

module.exports = { getConversations, getMessages, sendMessage, createGroupChat, uploadMediaChat };
