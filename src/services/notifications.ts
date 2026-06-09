import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const ensureNotificationPermission = async () => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextDateForStudySession(day, hour),
      channelId: Platform.OS === 'android' ? 'study-reminders' : undefined,
    } as Notifications.NotificationTriggerInput,
  });
};
