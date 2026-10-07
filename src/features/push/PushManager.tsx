import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { devicesApi } from '@/api/devices.api';
import type { DevicePlatform } from '@/api/types';
import { useNotificationBadge } from '@/features/notifications/BadgeProvider';
import { appVersion } from '@/services/device/deviceInfo';
import {
  configurePush,
  nativePushToken,
  onPushReceived,
  onPushTapped,
  onPushTokenChange,
  pushPermission,
  requestPushPermission,
  takeLaunchPush,
} from '@/services/push/push';
import { useAppSelector } from '@/store/hooks';

import { hrefForDeepLink } from './deepLink';

const register = (token: string) =>
  devicesApi.register(Platform.OS as DevicePlatform, token, appVersion()).catch(() => {
    // Push is best effort: the app works without it (bell, refresh on focus).
  });

/**
 * Push for the signed-in area (screen 3). Mounted only after sign-in, so permission is asked
 * after sign-in, never at app start. Renders nothing.
 */
export function PushManager() {
  const router = useRouter();
  const { refresh: refreshBadge } = useNotificationBadge();
  // /app-config "push on/off".
  const pushEnabled = useAppSelector((s) => s.appConfig.config?.firebase_enabled === true);

  useEffect(() => {
    configurePush();
  }, []);

  // Ask while the OS still allows it, then register this phone.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await pushPermission();
      let status = current.status;
      // Never asked = "undetermined" on iOS but "denied" + canAskAgain on Android.
      // The OS stops allowing the prompt after the user says no (Android: twice).
      if (status !== 'granted' && current.canAskAgain) status = await requestPushPermission();
      if (cancelled || status !== 'granted' || !pushEnabled) return;
      const token = await nativePushToken(); // null on iOS until API-GAPS #1 is answered
      if (token && !cancelled) await register(token);
    })().catch(() => {});
    const stopTokenWatch = pushEnabled ? onPushTokenChange((token) => void register(token)) : () => {};
    return () => {
      cancelled = true;
      stopTokenWatch();
    };
  }, [pushEnabled]);

  // Tapping a push opens data.deep_link — also when the tap launched the app.
  useEffect(() => {
    const open = (link: unknown) => {
      const href = hrefForDeepLink(link);
      if (href) router.push(href);
    };
    takeLaunchPush().then(open).catch(() => {});
    return onPushTapped(open);
  }, [router]);

  // Build guide: refresh the bell count after a push arrives.
  useEffect(() => onPushReceived(refreshBadge), [refreshBadge]);

  return null;
}
