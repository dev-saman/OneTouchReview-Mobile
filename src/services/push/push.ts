import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * The only module that uses expo-notifications (ESLint enforced).
 * Never logs tokens or notification content.
 */

export type PushPermission = 'granted' | 'denied' | 'undetermined';

/** Android push channel (Android 8+ needs one to show notifications). */
const CHANNEL_ID = 'default';

let configured = false;

/** Foreground presentation + Android channel. Safe to call more than once. */
export async function configurePush() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false, // the badge mirrors the bell count instead
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Messages, feedback and reviews',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

export async function pushPermission(): Promise<{ status: PushPermission; canAskAgain: boolean }> {
  const p = await Notifications.getPermissionsAsync();
  return { status: p.granted ? 'granted' : (p.status as PushPermission), canAskAgain: p.canAskAgain };
}

/** Shows the system prompt (only when the phone hasn't decided yet). */
export async function requestPushPermission(): Promise<PushPermission> {
  const p = await Notifications.requestPermissionsAsync();
  return p.granted ? 'granted' : (p.status as PushPermission);
}

/**
 * The native token for POST /devices (fcm_token). Android only: the iOS token type (APNs vs FCM)
 * is an open question (docs/API-GAPS.md #1), so iOS returns null until it's answered.
 */
export async function nativePushToken(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const token = await Notifications.getDevicePushTokenAsync();
  return typeof token.data === 'string' ? token.data : null;
}

/** Called with the new token whenever FCM rotates it (Android only, see nativePushToken). */
export function onPushTokenChange(listener: (token: string) => void) {
  const sub = Notifications.addPushTokenListener((token) => {
    if (Platform.OS === 'android' && typeof token.data === 'string') listener(token.data);
  });
  return () => sub.remove();
}

/** A push was tapped: hands over data.deep_link (validated by the caller). */
export function onPushTapped(listener: (deepLink: unknown) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    listener(response.notification.request.content.data?.deep_link);
  });
  return () => sub.remove();
}

/** The push that launched the app, if any (cleared once read so it opens only once). */
export async function takeLaunchPush(): Promise<unknown> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return undefined;
  await Notifications.clearLastNotificationResponseAsync().catch(() => {});
  return response.notification.request.content.data?.deep_link;
}

/** A push arrived while the app is open. */
export function onPushReceived(listener: () => void) {
  const sub = Notifications.addNotificationReceivedListener(() => listener());
  return () => sub.remove();
}

/** App icon badge = bell unread count. */
export function setAppBadge(count: number) {
  Notifications.setBadgeCountAsync(count).catch(() => {});
}
