import { network } from './network';
import { Paths } from './paths';
import type { DevicePlatform, NotificationPreferences } from './types';

/** Endpoints tab, rows "3 Push". */
export const devicesApi = {
  /** fcm_token from getDevicePushTokenAsync. Same token again = update. */
  register: async (platform: DevicePlatform, fcmToken: string, appVersion: string) =>
    (
      await network.post<{ device: { id: number } }>(Paths.devices, {
        platform,
        fcm_token: fcmToken,
        app_version: appVersion,
      })
    ).device,

  /** Stop push to this phone. 204. */
  remove: (id: number) => network.delete<void>(Paths.device(id)),

  preferences: (signal?: AbortSignal) => network.get<NotificationPreferences>(Paths.notificationPreferences, { signal }),

  /** Send any of the four booleans. */
  updatePreferences: (changes: Partial<NotificationPreferences>) =>
    network.put<NotificationPreferences>(Paths.notificationPreferences, changes),
};
