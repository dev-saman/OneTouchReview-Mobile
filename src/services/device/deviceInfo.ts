import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { DevicePlatform, SignInDeviceFields } from '@/api/types';

export const devicePlatform: DevicePlatform = Platform.OS === 'ios' ? 'ios' : 'android';

/** Shown in "Signed-in devices" (build guide example: "Nina's iPhone"). */
export function deviceName(): string {
  const name = Device.deviceName?.trim() || Device.modelName?.trim();
  return name || (devicePlatform === 'ios' ? 'iPhone' : 'Android phone');
}

/** device_name + platform, sent with every sign-in. */
export function signInDeviceFields(): SignInDeviceFields {
  return { device_name: deviceName(), platform: devicePlatform };
}

/** The installed native version (e.g. "1.0.0"), compared with /app-config min_app_version. */
export function appVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0';
}
