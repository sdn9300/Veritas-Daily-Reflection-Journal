import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_KEY = "@reminder_settings";
const NOTIFICATION_ID_KEY = "@reminder_notification_id";

export interface ReminderSettings {
  enabled: boolean;
  hour: number;   // 1-12
  minute: number; // 0, 15, 30, 45
  ampm: "AM" | "PM";
}

export const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
  ampm: "PM",
};

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    if (raw) return JSON.parse(raw) as ReminderSettings;
  } catch {}
  return DEFAULT_REMINDER;
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function to24Hour(hour: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") {
    return hour === 12 ? 0 : hour;
  } else {
    return hour === 12 ? 12 : hour + 12;
  }
}

export async function scheduleReminder(settings: ReminderSettings): Promise<void> {
  await cancelReminder();

  const granted = await requestNotificationPermission();
  if (!granted) throw new Error("Permission denied");

  const hour24 = to24Hour(settings.hour, settings.ampm);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to reflect",
      body: "How was your day? Take a few minutes to journal your thoughts.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hour24,
      minute: settings.minute,
    },
  });

  await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id);
}

export async function cancelReminder(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
    }
  } catch {}
}

export function formatReminderTime(s: ReminderSettings): string {
  const min = s.minute === 0 ? "00" : String(s.minute);
  return `${s.hour}:${min} ${s.ampm}`;
}
