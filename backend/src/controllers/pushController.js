const webpush = require('web-push');
const prisma = require('../config/db');

// Configure VAPID keys for web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'noreply@waplike.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// POST /api/push/subscribe
async function saveSubscription(req, res) {
  const { endpoint, keys } = req.body;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: req.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  res.json({ success: true });
}

// Utility: send a push notification to a specific user
async function sendPushToUser(userId, title, body, url = '/') {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify({ title, body, url });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
    } catch (err) {
      // If subscription is invalid/expired, remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
      }
    }
  }
}

module.exports = { saveSubscription, sendPushToUser };
