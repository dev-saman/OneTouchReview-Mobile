import { signInDeviceFields } from '@/services/device/deviceInfo';

import { network } from './network';
import { Paths } from './paths';
import type { Business, DeviceSession, EmailCodeResponse, GoogleSignInResponse, SignInResponse, User } from './types';

/** Endpoints tab, rows "1 Sign in". */
export const authApi = {
  /** Sends a 6-digit sign-in code. Always 200, whether or not an account exists. */
  requestEmailCode: (email: string) =>
    network.post<EmailCodeResponse>(Paths.emailCode, { email, purpose: 'login' }),

  verifyEmailCode: (email: string, code: string) =>
    network.post<SignInResponse>(Paths.emailCodeVerify, { email, code, ...signInDeviceFields() }),

  /** "Use password instead". */
  login: (email: string, password: string) =>
    network.post<SignInResponse>(Paths.login, { email, password, ...signInDeviceFields() }),

  /** Native Google ID token. 503 GOOGLE_SIGNIN_OFF until enabled server-side. */
  googleIdToken: (idToken: string) =>
    network.post<GoogleSignInResponse>(Paths.googleIdToken, { id_token: idToken, ...signInDeviceFields() }),

  /** The reset link opens the web app. */
  forgotPassword: (email: string) => network.post<unknown>(Paths.forgotPassword, { email }),

  /** Start here: "Shows the user, user.role and the business with its locations". */
  me: (signal?: AbortSignal) => network.get<{ user: User; business: Business }>(Paths.me, { signal }),

  /** Also removes this device's push registration. */
  logout: () => network.post<unknown>(Paths.logout),

  /** Signed-in devices; current: true marks this phone. */
  sessions: async (signal?: AbortSignal) =>
    (await network.get<{ sessions: DeviceSession[] }>(Paths.sessions, { signal })).sessions ?? [],

  /** Sign out one device. 204. */
  signOutDevice: (id: number) => network.delete<void>(Paths.session(id)),

  /** Sign out all other devices. 204. */
  signOutOtherDevices: () => network.delete<void>(Paths.sessions),
};
