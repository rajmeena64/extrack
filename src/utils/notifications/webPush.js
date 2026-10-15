import api from '@/utils/common/serve';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export function isWebPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getWebPushStatus() {
  if (!isWebPushSupported()) return { supported: false, permission: 'denied', subscribed: false };
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return { supported: true, permission: Notification.permission, subscribed: Boolean(sub) };
}

export async function registerWebPush() {
  if (!isWebPushSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await api.get('/notifications/push/public-key');
      const pubKey = res?.data?.publicKey || res?.publicKey;
      if (!pubKey) return false;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey)
      });
    }
    const subJson = sub.toJSON();
    await api.post('/notifications/push/subscribe', {
      endpoint: sub.endpoint,
      keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth }
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterWebPush() {
  if (!isWebPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      await api.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}
