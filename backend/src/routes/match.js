const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { discover, swipe, undoSwipe, getMatches } = require('../controllers/matchController');

router.get('/discover', requireAuth, discover);
router.post('/swipe', requireAuth, swipe);
router.post('/swipe/undo', requireAuth, undoSwipe);
router.get('/matches', requireAuth, getMatches);

module.exports = router;
