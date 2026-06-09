import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';
import setNotificationChannelAsync from 'expo-notifications/build/setNotificationChannelAsync.android';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import {
  SchedulableTriggerInputTypes,
  type NotificationTriggerInput,
} from 'expo-notifications/build/Notifications.types';

setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const ensureNotificationPermission = async () => {
  const current = await getPermissionsAsync();
  if (current.granted) return true;
  const next = await requestPermissionsAsync();
  return next.granted;
};

export const nextDateForStudySession = (day: number, hour: number, minutesBefore = 15) => {
  const now = new Date();
  const date = new Date(now);
  const normalizedDay = day === 7 ? 0 : day;
  date.setDate(now.getDate() + ((normalizedDay - now.getDay() + 7) % 7));
  date.setHours(hour, 0, 0, 0);
  date.setMinutes(date.getMinutes() - minutesBefore);
  if (date <= now) date.setDate(date.getDate() + 7);
  return date;
};

export const scheduleStudyReminder = async ({
  title,
  body,
  day,
  hour,
}: {
  title: string;
  body: string;
  day: number;
  hour: number;
}) => {
  const allowed = await ensureNotificationPermission();
  if (!allowed) throw new Error('Notification permission was not granted.');

  await setNotificationChannelAsync('study-reminders', {
    name: 'Study reminders',
    importance: AndroidImportance.HIGH,
  });

  return scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: nextDateForStudySession(day, hour),
      channelId: 'study-reminders',
    } as NotificationTriggerInput,
  });
};
