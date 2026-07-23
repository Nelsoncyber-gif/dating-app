const Stripe = require('stripe');
const prisma = require('../config/db');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Premium price in cents — $9.99/month (adjust as needed)
const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID; // Set in .env, or we use inline pricing

// POST /api/premium/checkout — Creates a Stripe Checkout session
async function createCheckoutSession(req, res) {
  const userId = req.userId;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment', // One-time payment (use 'subscription' for recurring)
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Waplike Premium — 1 Month',
              description: 'Unlimited swipes, 5 super likes/day, see who liked you, and more!',
            },
            unit_amount: 999, // $9.99
          },
          quantity: 1,
        },
      ],
      metadata: { userId },
      success_url: `${process.env.CLIENT_URL}/profile?premium=success`,
      cancel_url: `${process.env.CLIENT_URL}/premium?canceled=true`,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

// POST /api/premium/webhook — Stripe webhook to activate premium
async function handlePremiumWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (userId) {
      // Activate premium for 30 days from now
      const premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: { isPremium: true, premiumUntil },
      });
    }
  }

  return res.json({ received: true });
}

module.exports = { createCheckoutSession, handlePremiumWebhook };
