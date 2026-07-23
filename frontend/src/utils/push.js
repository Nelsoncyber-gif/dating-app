import api from '../api/client';

/**
 * Convert a base64 string to a Uint8Array (required by PushManager.subscribe).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the service worker, subscribe to push notifications,
 * and send the subscription to the backend.
 */
export async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
      // Re-send in case the server lost it
      await api.post('/push/subscribe', existingSubscription.toJSON());
      return;
    }

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });
    await api.post('/push/subscribe', newSubscription.toJSON());
  } catch (err) {
    console.warn('Push notification setup failed:', err);
  }
}
