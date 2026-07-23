const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { uploadMedia } = require('../middleware/upload');
const {
  getConversations, getMessages, sendMessage, createGroupChat, uploadMediaChat,
} = require('../controllers/chatController');

router.get('/', requireAuth, getConversations);
router.post('/group', requireAuth, createGroupChat);
router.get('/:id/messages', requireAuth, getMessages);
router.post('/:id/messages', requireAuth, sendMessage);
router.post('/:id/media', requireAuth, uploadMedia.single('file'), uploadMediaChat);

module.exports = router;
