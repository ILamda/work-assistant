// src/notification.js

// 브라우저 및 앱 기본 알림 권한 요청
export async function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// 상단 알림 전송 함수
export function sendAppNotification(title, body, enabled = true) {
  if (!enabled) return;

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: '/favicon.ico'
    });
  }
}