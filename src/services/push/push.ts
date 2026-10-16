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

/** A tapped push: its data (all strings per the Push tab, validated by the caller), title and body. */
export type TappedPush = { data: Record<string, unknown>; title: string | null; body: string | null };

const tapped = (response: Notifications.NotificationResponse): TappedPush => {
  const content = response.notification.request.content;
  return { data: (content.data ?? {}) as Record<string, unknown>, title: content.title ?? null, body: content.body ?? null };
};

/** A push was tapped. */
export function onPushTapped(listener: (push: TappedPush) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => listener(tapped(response)));
  return () => sub.remove();
}

/** The push that launched the app, if any (cleared once read so it opens only once). */
export async function takeLaunchPush(): Promise<TappedPush | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  await Notifications.clearLastNotificationResponseAsync().catch(() => {});
  return tapped(response);
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
