const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  listCommunities, getCommunity, createCommunity, joinCommunity, leaveCommunity,
} = require('../controllers/communityController');

router.get('/', requireAuth, listCommunities);
router.get('/:id', requireAuth, getCommunity);
router.post('/', requireAuth, createCommunity);
router.post('/:id/join', requireAuth, joinCommunity);
router.post('/:id/leave', requireAuth, leaveCommunity);

module.exports = router;
