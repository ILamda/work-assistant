export async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
  
  export function sendAppNotification(title, body, isEnabled) {
    if (!isEnabled) return;
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🚨 ${title}`, { body, tag: 'lambda-alert', renotify: true });
      } catch (e) {
        console.log('Notification error:', e);
      }
    }
  }