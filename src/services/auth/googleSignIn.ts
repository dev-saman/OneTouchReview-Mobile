import { Platform } from 'react-native';

import { Config } from '@/config/env';

/**
 * Native Google Sign-In → ID token for POST /auth/google/id-token.
 *
 * Disabled until the owner creates the OAuth clients and the IDs are supplied through
 * GOOGLE_WEB_CLIENT_ID / GOOGLE_IOS_CLIENT_ID / GOOGLE_IOS_URL_SCHEME (app.config.ts).
 * The module is required lazily so nothing native runs while it is unconfigured.
 */

let configured = false;

export function isGoogleSignInConfigured(): boolean {
  if (!Config.google.webClientId) return false;
  return Platform.OS !== 'ios' || !!Config.google.iosClientId;
}

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

function load(): GoogleModule {
  // Lazy on purpose: the native module is not touched until Google sign-in is configured and used.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-google-signin/google-signin') as GoogleModule;
  if (!configured) {
    mod.GoogleSignin.configure({
      webClientId: Config.google.webClientId ?? undefined,
      iosClientId: Config.google.iosClientId ?? undefined,
    });
    configured = true;
  }
  return mod;
}

/** Returns the ID token, or null when the user cancelled. Never stored. */
export async function getGoogleIdToken(): Promise<string | null> {
  const { GoogleSignin, isSuccessResponse } = load();
  if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Clear any previous Google session so the account picker always shows.
  await GoogleSignin.signOut().catch(() => undefined);
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) return null;
  return result.data.idToken ?? null;
}
