const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { registerCallHandlers } = require('./calls');
const { sendPushToUser } = require('../controllers/pushController');

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

    socket.on('send_message', async ({ conversationId, content, mediaUrl, mediaType }, callback) => {
      try {
        if ((!content || !content.trim()) && !mediaUrl) {
          return callback?.({ error: 'Message content or media is required' });
        }

        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!participant) return callback?.({ error: 'Not a participant of this conversation' });

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content: content?.trim() || '',
            mediaUrl: mediaUrl || null,
            mediaType: mediaType || null,
          },
          include: { sender: { select: { id: true, name: true } } },
        });

        io.to(conversationId).emit('new_message', message);

        // Notify other participants
        const others = await prisma.conversationParticipant.findMany({
          where: { conversationId, userId: { not: userId } },
        });
        const senderName = message.sender?.name || 'Someone';
        const pushBody = mediaUrl ? `Sent a ${mediaType}` : content.trim().slice(0, 80);
        for (const p of others) {
          await prisma.notification.create({
            data: { userId: p.userId, type: 'MESSAGE', payload: { conversationId, messageId: message.id } },
          });
          io.to(`user:${p.userId}`).emit('notification', { type: 'MESSAGE', conversationId });
          // Send browser push so they see it even if the tab is backgrounded
          sendPushToUser(p.userId, `${senderName}`, pushBody, `/chats/${conversationId}`);
        }

        callback?.({ message });
      } catch (err) {
        callback?.({ error: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_typing', { userId, conversationId });
    });

    // Mark all messages in a conversation as read up to now
    socket.on('mark_read', async ({ conversationId }) => {
      try {
        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!participant) return;

        // Update all unread messages from OTHER users in this conversation
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            readAt: null,
          },
          data: { readAt: new Date() },
        });

        // Notify other participants that their messages have been read
        socket.to(conversationId).emit('messages_read', { conversationId, readByUserId: userId });
      } catch (err) {
        console.error('mark_read error:', err);
      }
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
