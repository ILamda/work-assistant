// src/routineNotification.js
import { LocalNotifications } from '@capacitor/local-notifications';

const isCapacitor = () => {
  return typeof window !== 'undefined' && window.Capacitor !== undefined;
};

// 1. 알림 권한 요청
export async function requestRoutinePermission() {
  if (isCapacitor()) {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } else if ('Notification' in window) {
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  return false;
}

// 2. 루틴 알람 등록 (매일 특정 시/분 반복)
export async function scheduleRoutineAlarm(id, title, timeStr) {
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isCapacitor()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Number(id % 2147483647),
            title: `⏰ 루틴 알람: ${title}`,
            body: `설정하신 ${timeStr} 루틴 시간입니다!`,
            schedule: {
              on: { hour, minute },
              repeats: true,
              allowWhileIdle: true
            },
            sound: 'beep.wav'
          }
        ]
      });
    } catch (err) {
      console.error('Capacitor schedule error:', err);
    }
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`[루틴 등록됨] ${title}`, {
        body: `매일 ${timeStr} 알람으로 등록되었습니다.`
      });
    }
  }
}

// 3. 루틴 알람 취소
export async function cancelRoutineAlarm(id) {
  if (isCapacitor()) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: Number(id % 2147483647) }]
      });
    } catch (err) {
      console.error('Capacitor cancel error:', err);
    }
  }
}