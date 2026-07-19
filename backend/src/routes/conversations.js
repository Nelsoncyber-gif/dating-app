const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getConversations, getMessages, sendMessage, createGroupChat,
} = require('../controllers/chatController');

router.get('/', requireAuth, getConversations);
router.post('/group', requireAuth, createGroupChat);
router.get('/:id/messages', requireAuth, getMessages);
router.post('/:id/messages', requireAuth, sendMessage);

module.exports = router;
