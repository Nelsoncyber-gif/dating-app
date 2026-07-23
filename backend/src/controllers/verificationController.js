const Stripe = require('stripe');
const prisma = require('../config/db');

// Initialize Stripe (make sure STRIPE_SECRET_KEY is in your .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/verification/verify - Creates a session and returns the URL for the user
async function createVerificationSession(req, res) {
  const userId = req.userId;
  
  try {
    // Create a verification session in Stripe
    const session = await stripe.identity.verificationSessions.create({
      type: 'document', // Checks ID + Facial recognition
      metadata: { userId }, // Pass userId so we know who to update in the webhook
    });

    // Update user status locally
    await prisma.user.update({
      where: { id: userId },
      data: { 
        verificationStatus: 'pending', 
        verificationExtId: session.id 
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe verification error:', error);
    return res.status(500).json({ error: 'Failed to start verification' });
  }
}

// POST /api/verification/webhooks/stripe-identity - Receives results from Stripe
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the webhook signature (STRIPE_WEBHOOK_SECRET must be in .env)
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'identity.verification_session.verified') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: true, verificationStatus: 'verified' },
      });
    }
  } 
  else if (event.type === 'identity.verification_session.canceled' || event.type === 'identity.verification_session.requires_input') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: 'rejected' },
      });
    }
  }

  res.json({ received: true });
}

module.exports = { createVerificationSession, handleWebhook };