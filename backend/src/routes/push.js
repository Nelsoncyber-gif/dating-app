const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { saveSubscription } = require('../controllers/pushController');

// POST /api/push/subscribe - Save a browser push subscription
router.post('/subscribe', requireAuth, saveSubscription);

module.exports = router;
