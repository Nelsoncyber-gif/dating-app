const prisma = require('../config/db');

// Tracks which socket belongs to which user, so we can ring a specific person
// even if they have the app open but aren't "in" a specific conversation room.
// Simple in-memory map — fine for a single-server school project deployment.
const userSockets = new Map(); // userId -> Set of socket ids

function registerCallHandlers(io, socket) {
  const userId = socket.userId;

  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket.id);

  // Caller initiates: { conversationId, toUserId, offer, callType: 'audio' | 'video' }
  socket.on('call_offer', async ({ conversationId, toUserId, offer, callType }) => {
    // Confirm the caller actually shares this conversation with the callee -
    // prevents someone from ringing an arbitrary user id they aren't matched/connected with.
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) return;

    const targetSockets = userSockets.get(toUserId);
    if (!targetSockets || targetSockets.size === 0) {
      // Callee isn't online right now
      socket.emit('call_unavailable', { conversationId });
      return;
    }

    targetSockets.forEach((sockId) => {
      io.to(sockId).emit('call_incoming', {
        conversationId,
        fromUserId: userId,
        offer,
        callType,
      });
    });
  });

  // Callee accepts: relay their answer back to the caller
  socket.on('call_answer', ({ toUserId, answer, conversationId }) => {
    const targetSockets = userSockets.get(toUserId);
    targetSockets?.forEach((sockId) => {
      io.to(sockId).emit('call_answered', { conversationId, answer, fromUserId: userId });
    });
  });

  // Either side declines/cancels before connecting
  socket.on('call_decline', ({ toUserId, conversationId }) => {
    const targetSockets = userSockets.get(toUserId);
    targetSockets?.forEach((sockId) => {
      io.to(sockId).emit('call_declined', { conversationId, fromUserId: userId });
    });
  });

  // ICE candidates exchanged as they trickle in on both sides
  socket.on('call_ice_candidate', ({ toUserId, candidate, conversationId }) => {
    const targetSockets = userSockets.get(toUserId);
    targetSockets?.forEach((sockId) => {
      io.to(sockId).emit('call_ice_candidate', { conversationId, candidate, fromUserId: userId });
    });
  });

  // Either side hangs up once connected
  socket.on('call_end', ({ toUserId, conversationId }) => {
    const targetSockets = userSockets.get(toUserId);
    targetSockets?.forEach((sockId) => {
      io.to(sockId).emit('call_ended', { conversationId, fromUserId: userId });
    });
  });

  socket.on('disconnect', () => {
    userSockets.get(userId)?.delete(socket.id);
    if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
  });
}

module.exports = { registerCallHandlers };
