const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
} = require('../controllers/notificationController');

router.get('/', requireAuth, getNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.patch('/:id/read', requireAuth, markAsRead);
router.patch('/read-all', requireAuth, markAllAsRead);

module.exports = router;
