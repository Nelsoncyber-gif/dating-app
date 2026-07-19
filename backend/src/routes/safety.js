const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  reportUser, blockUser, unblockUser, getBlockedUsers,
} = require('../controllers/safetyController');

router.post('/report', requireAuth, reportUser);
router.post('/block', requireAuth, blockUser);
router.delete('/block/:blockedId', requireAuth, unblockUser);
router.get('/blocked', requireAuth, getBlockedUsers);

module.exports = router;
