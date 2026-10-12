import { Platform } from 'react-native';

import { devicesApi } from '@/api/devices.api';
import type { DevicePlatform } from '@/api/types';
import { appVersion } from '@/services/device/deviceInfo';

/** Token registered (or being registered) in this session. Cleared on failure so it can retry. */
let registeredToken: string | null = null;

/**
 * POST /devices once per token. Fetching the token also fires the token-change
 * listener with the same token, which used to register this phone twice.
 */
export async function registerDevice(token: string): Promise<void> {
  if (token === registeredToken) return;
  registeredToken = token;
  try {
    await devicesApi.register(Platform.OS as DevicePlatform, token, appVersion());
  } catch {
    // Push is best effort: the app works without it (bell, refresh on focus).
    if (registeredToken === token) registeredToken = null;
  }
}

/** Sign-out ends the server's registration (POST /auth/logout), so the next sign-in registers again. */
export function resetDeviceRegistration(): void {
  registeredToken = null;
}
