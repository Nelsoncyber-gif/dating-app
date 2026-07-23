const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createCheckoutSession, handlePremiumWebhook } = require('../controllers/premiumController');

// Webhook MUST be registered before the json middleware strips the raw body.
// In practice, mount this route before express.json() or use express.raw() here.
router.post('/webhook', express.raw({ type: 'application/json' }), handlePremiumWebhook);

// Authenticated user creates a Stripe Checkout session
router.post('/checkout', requireAuth, createCheckoutSession);

module.exports = router;
