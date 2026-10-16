import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { notificationsApi } from '@/api/notifications.api';
import { selectSelectedLocation } from '@/features/location/selectors';
import { useNotificationBadge } from '@/features/notifications/BadgeProvider';
import { openTarget } from '@/features/notifications/openTarget';
import { pushNotificationId, pushTarget } from '@/features/notifications/target';
import {
  configurePush,
  nativePushToken,
  onPushReceived,
  onPushTapped,
  onPushTokenChange,
  pushPermission,
  requestPushPermission,
  takeLaunchPush,
  type TappedPush,
} from '@/services/push/push';
import { useAppSelector } from '@/store/hooks';

import { registerDevice, resetDeviceRegistration } from './registerDevice';

/**
 * Push for the signed-in area (screen 3). Mounted only after sign-in, so permission is asked
 * after sign-in, never at app start. Renders nothing.
 */
export function PushManager() {
  const router = useRouter();
  const { refresh: refreshBadge, setCount: setBadgeCount } = useNotificationBadge();
  const location = useAppSelector(selectSelectedLocation);
  // Read by the tap handler, which is set up once.
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);
  // /app-config "push on/off".
  const pushEnabled = useAppSelector((s) => s.appConfig.config?.firebase_enabled === true);

  useEffect(() => {
    configurePush();
    // Unmounted on sign-out, which ends this phone's registration on the server.
    return resetDeviceRegistration;
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
      if (token && !cancelled) await registerDevice(token);
    })().catch(() => {});
    const stopTokenWatch = pushEnabled ? onPushTokenChange((token) => void registerDevice(token)) : () => {};
    return () => {
      cancelled = true;
      stopTokenWatch();
    };
  }, [pushEnabled]);

  // Tapping a push opens its item by data.type (Push tab) — also when the tap launched the app.
  useEffect(() => {
    const open = (push: TappedPush | null) => {
      if (!push) return;
      // Account and assistant pushes stand for a bell item: mark it read.
      const notificationId = pushNotificationId(push.data);
      const selected = locationRef.current;
      if (notificationId !== null && selected !== null) {
        notificationsApi
          .markRead(notificationId, selected)
          .then((answer) => setBadgeCount(answer.unread_count))
          .catch(() => {});
      }
      const target = pushTarget(push.data);
      if (target) openTarget(router, target, { title: push.title, body: push.body });
    };
    takeLaunchPush().then(open).catch(() => {});
    return onPushTapped(open);
  }, [router, setBadgeCount]);

  // Build guide: refresh the bell count after a push arrives.
  useEffect(() => onPushReceived(refreshBadge), [refreshBadge]);

  return null;
}
