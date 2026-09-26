import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useActiveWorkout } from './active-workout-store';

const CHANNEL_ID = 'rest-timer';

// Show the "rest over" alert even when the app is open on another screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permission: Promise<boolean> | null = null;

/** Asks once per launch; rest still works in-app if the user says no. */
function ensurePermission(): Promise<boolean> {
  permission ??= (async () => {
    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Rest timer',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  })().catch(() => false);
  return permission;
}

async function schedule(seconds: number): Promise<string | null> {
  if (seconds < 1 || !(await ensurePermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest over', body: 'Time for your next set.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(seconds),
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

function cancel(notificationId: string | null) {
  if (notificationId) {
    Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
  }
}

/** Starts (or restarts) the rest countdown. `totalSeconds` sizes the progress bar. */
export async function startRest(seconds: number, totalSeconds = seconds) {
  const { rest, setRest } = useActiveWorkout.getState();
  cancel(rest?.notificationId ?? null);
  const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
  setRest({ endsAt, totalSeconds, notificationId: null });

  const notificationId = await schedule(seconds);
  // Only attach it if this rest is still the current one.
  const current = useActiveWorkout.getState().rest;
  if (current?.endsAt === endsAt) setRest({ ...current, notificationId });
  else cancel(notificationId);
}

/** +15 s / −15 s. Going to zero or below ends the rest. */
export function adjustRest(deltaSeconds: number) {
  const { rest } = useActiveWorkout.getState();
  if (!rest) return;
  const remaining = (new Date(rest.endsAt).getTime() - Date.now()) / 1000 + deltaSeconds;
  if (remaining <= 0) return skipRest();
  void startRest(remaining, Math.max(rest.totalSeconds + deltaSeconds, remaining));
}

export function skipRest() {
  const { rest, setRest } = useActiveWorkout.getState();
  cancel(rest?.notificationId ?? null);
  setRest(null);
}

/** Called by the on-screen countdown when it reaches zero while the app is open. */
export function completeRest() {
  const { rest, setRest } = useActiveWorkout.getState();
  if (!rest) return;
  // The scheduled notification fires on its own; leave it so a backgrounded app still alerts.
  setRest(null);
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Clears any pending "rest over" alert, e.g. when the workout ends. */
export function cancelRestNotification() {
  cancel(useActiveWorkout.getState().rest?.notificationId ?? null);
}
