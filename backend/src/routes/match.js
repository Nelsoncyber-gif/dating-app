const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { discover, swipe, undoSwipe, getMatches, getMilestones, createMilestone, getDailyPick } = require('../controllers/matchController');

router.get('/discover', requireAuth, discover);
router.post('/swipe', requireAuth, swipe);
router.post('/swipe/undo', requireAuth, undoSwipe);
router.get('/matches', requireAuth, getMatches);
router.get('/matches/:matchId/milestones', requireAuth, getMilestones);
router.post('/matches/:matchId/milestones', requireAuth, createMilestone);
router.get('/discover/daily-pick', requireAuth, getDailyPick);

module.exports = router;
