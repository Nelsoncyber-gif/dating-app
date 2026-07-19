const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { registerCallHandlers } = require('./calls');

// Auth middleware for socket connections - client sends token in handshake auth
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
}

function registerChatHandlers(io) {
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    const userId = socket.userId;

    // Join a room for every conversation this user is part of,
    // so messages route to them without extra client-side subscribe calls.
    const participantRows = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    participantRows.forEach((p) => socket.join(p.conversationId));

    // Also join a personal room for direct notifications (new match, etc.)
    socket.join(`user:${userId}`);

    registerCallHandlers(io, socket);

    socket.on('send_message', async ({ conversationId, content }, callback) => {
      try {
        if (!content || !content.trim()) {
          return callback?.({ error: 'Message content is required' });
        }

        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!participant) return callback?.({ error: 'Not a participant of this conversation' });

        const message = await prisma.message.create({
          data: { conversationId, senderId: userId, content },
          include: { sender: { select: { id: true, name: true } } },
        });

        io.to(conversationId).emit('new_message', message);

        // Notify other participants
        const others = await prisma.conversationParticipant.findMany({
          where: { conversationId, userId: { not: userId } },
        });
        for (const p of others) {
          await prisma.notification.create({
            data: { userId: p.userId, type: 'MESSAGE', payload: { conversationId, messageId: message.id } },
          });
          io.to(`user:${p.userId}`).emit('notification', { type: 'MESSAGE', conversationId });
        }

        callback?.({ message });
      } catch (err) {
        callback?.({ error: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_typing', { userId, conversationId });
    });

    socket.on('join_conversation', (conversationId) => {
      // Used after a new group chat or match is created mid-session
      socket.join(conversationId);
    });

    socket.on('disconnect', () => {
      // Presence/online-status tracking could hook in here later
    });
  });
}

module.exports = { registerChatHandlers };
