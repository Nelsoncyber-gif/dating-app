const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getMatches, getPendingLikes, getCallLogs, getMyLikes } = require('../controllers/socialController');

router.get('/matches', requireAuth, getMatches);
router.get('/pending', requireAuth, getPendingLikes);
router.get('/calls', requireAuth, getCallLogs);
router.get('/likes', requireAuth, getMyLikes);

module.exports = router;
