import api from './api';

export type NotificationPreferences = {
  id?: string;
  user_id?: string;
  planner_reminders: boolean;
  chat_messages: boolean;
  news_updates: boolean;
  billing_alerts: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  planner_reminders: true,
  chat_messages: true,
  news_updates: true,
  billing_alerts: true,
};

export const getNotificationPreferences = async () => {
  const response = await api.get('/api/notifications/preferences');
  return {
    ...defaultNotificationPreferences,
    ...response.data,
  } as NotificationPreferences;
};

export const updateNotificationPreferences = async (prefs: Partial<NotificationPreferences>) => {
  const response = await api.put('/api/notifications/preferences', prefs);
  return {
    ...defaultNotificationPreferences,
    ...response.data,
  } as NotificationPreferences;
};
