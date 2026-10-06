import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

/** Only a non-empty string counts as configured (Expo may serialize unset values as {}). */
const configuredString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const DAY_MS = 24 * 60 * 60 * 1000;

export const Config = {
  /** The only backend. Sheet "Start here": every path is under this. */
  apiOrigin: 'https://api.onetouchreview.com',
  apiBaseUrl: 'https://api.onetouchreview.com/api/v1',

  requestTimeoutMs: 20_000,
  uploadTimeoutMs: 60_000,

  /** Build guide: refresh "when less than 30 days are left" of the 90-day sliding token. */
  tokenRefreshWindowMs: 30 * DAY_MS,

  /**
   * Errors tab: 429 → "Wait and retry once". GET requests retry automatically when the
   * wait is short; longer waits are surfaced to the user as a countdown instead.
   */
  maxAutoRetryAfterSeconds: 10,

  /** Development only. Logs method, path and status — never headers, bodies or queries. */
  enableNetworkLogging: __DEV__ && process.env.NODE_ENV !== 'test',

  /** Not configured until the owner creates the OAuth clients. Null → Google button hidden. */
  google: {
    webClientId: configuredString(extra.googleWebClientId),
    iosClientId: configuredString(extra.googleIosClientId),
  },
} as const;
