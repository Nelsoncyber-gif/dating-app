const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createVerificationSession, handleWebhook } = require('../controllers/verificationController');

// Raw body parser is REQUIRED for Stripe webhooks to verify signatures
router.post('/webhooks/stripe-identity', express.raw({ type: 'application/json' }), handleWebhook);

router.post('/verify', requireAuth, createVerificationSession);

module.exports = router;