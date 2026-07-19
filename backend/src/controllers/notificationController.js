const prisma = require('../config/db');

// GET /api/notifications - most recent first, capped at 50
async function getNotifications(req, res) {
  const userId = req.userId;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.json({ notifications });
}

// GET /api/notifications/unread-count - lightweight, for a badge count
async function getUnreadCount(req, res) {
  const userId = req.userId;
  const count = await prisma.notification.count({ where: { userId, read: false } });
  return res.json({ count });
}

// PATCH /api/notifications/:id/read
async function markAsRead(req, res) {
  const userId = req.userId;
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  await prisma.notification.update({ where: { id }, data: { read: true } });
  return res.json({ read: true });
}

// PATCH /api/notifications/read-all
async function markAllAsRead(req, res) {
  const userId = req.userId;
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return res.json({ updated: true });
}

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
