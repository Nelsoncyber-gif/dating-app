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

    // Socket rate limiting: max 30 messages per 10 seconds per connection
    const msgTimestamps = [];
    const MSG_LIMIT = 30;
    const MSG_WINDOW_MS = 10000;

    function checkRateLimit() {
      const now = Date.now();
      // Remove timestamps older than the window
      while (msgTimestamps.length > 0 && msgTimestamps[0] < now - MSG_WINDOW_MS) {
        msgTimestamps.shift();
      }
      if (msgTimestamps.length >= MSG_LIMIT) {
        return false; // Rate limited
      }
      msgTimestamps.push(now);
      return true;
    }

    try {
      // Join a room for every conversation this user is part of,
      // so messages route to them without extra client-side subscribe calls.
      const participantRows = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      participantRows.forEach((p) => socket.join(p.conversationId));
    } catch (err) {
      console.error('Socket connection setup error for user', userId, err);
    }

    // Also join a personal room for direct notifications (new match, etc.)
    socket.join(`user:${userId}`);

    registerCallHandlers(io, socket);

    socket.on('send_message', async ({ conversationId, content, mediaUrl, mediaType }, callback) => {
      try {
        if (!checkRateLimit()) {
          return callback?.({ error: 'You are sending messages too fast. Please slow down.' });
        }

        if ((!content || !content.trim()) && !mediaUrl) {
          return callback?.({ error: 'Message content or media is required' });
        }

        if (content && content.length > 5000) {
          return callback?.({ error: 'Message too long (max 5000 characters)' });
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

        // Check if this is the first message in the conversation and create milestone
        const msgCount = await prisma.message.count({ where: { conversationId } });
        if (msgCount === 1) {
          // Find the match for this conversation
          const match = await prisma.match.findUnique({ where: { conversationId } });
          if (match) {
            await prisma.milestone.upsert({
              where: { matchId_type: { matchId: match.id, type: 'first_message' } },
              update: {},
              create: { matchId: match.id, type: 'first_message' },
            });
          }
        }

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

    // Message reactions (emoji reactions on individual messages)
    socket.on('react_to_message', async ({ messageId, emoji }, callback) => {
      try {
        const VALID_EMOJIS = ['heart', 'laugh', 'wow', 'sad', 'fire'];
        if (!messageId || !VALID_EMOJIS.includes(emoji)) {
          return callback?.({ error: 'Valid messageId and emoji required' });
        }

        // Verify user is a participant in the conversation
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { conversationId: true },
        });
        if (!message) return callback?.({ error: 'Message not found' });

        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId: message.conversationId, userId } },
        });
        if (!participant) return callback?.({ error: 'Not a participant of this conversation' });

        // Upsert: if user already reacted, remove it (toggle behavior)
        const existing = await prisma.messageReaction.findUnique({
          where: { messageId_userId: { messageId, userId } },
        });

        let reaction;
        if (existing) {
          await prisma.messageReaction.delete({ where: { id: existing.id } });
          reaction = null;
        } else {
          reaction = await prisma.messageReaction.create({
            data: { messageId, userId, emoji },
            include: { user: { select: { id: true, name: true } } },
          });
        }

        io.to(message.conversationId).emit('message_reaction', {
          messageId,
          reaction,
          removed: !reaction,
        });

        callback?.({ reaction, removed: !reaction });
      } catch (err) {
        console.error('react_to_message error:', err);
        callback?.({ error: 'Failed to react to message' });
      }
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
