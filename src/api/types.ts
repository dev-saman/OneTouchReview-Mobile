/**
 * API types. Only fields documented in the Sheet (or confirmed against a captured
 * response from the test business) belong here. Do not add guessed fields.
 */

export type DevicePlatform = 'ios' | 'android';

// ---------------------------------------------------------------------------
// Errors — Sheet "Errors": { error: { code, message, details } }
// ---------------------------------------------------------------------------

export type ApiErrorKind =
  | 'offline' // device has no connection; request was never sent
  | 'network' // request failed without a response
  | 'timeout'
  | 'cancelled'
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'validation' // 422 VALIDATION_FAILED
  | 'rejected' // other 4xx with an error.code (RECENTLY_REQUESTED, INVALID_CODE, 402 ...)
  | 'rateLimited' // 429
  | 'server' // 5xx
  | 'unknown';

export type ApiError = {
  readonly isApiError: true;
  kind: ApiErrorKind;
  status?: number;
  /** error.code from the server. Branch on this, never on message text. */
  code?: string;
  /** error.message from the server when present, otherwise a local default. */
  message: string;
  /** True when `message` came from the server. */
  serverMessage: boolean;
  details?: Record<string, unknown>;
  /** VALIDATION_FAILED: details as field → messages. */
  fieldErrors?: Record<string, string[]>;
  /** 429: Retry-After header or details.retry_after, in seconds. */
  retryAfterSeconds?: number;
};

// ---------------------------------------------------------------------------
// GET /app-config (no token)
// ---------------------------------------------------------------------------

export type AppConfig = {
  min_app_version: Record<DevicePlatform, string>;
  latest_app_version: Record<DevicePlatform, string>;
  /** Currently null on both platforms (open item in docs/API-GAPS.md). */
  store_urls: Record<DevicePlatform, string | null>;
  /** null when realtime is off (Sheet response example). */
  reverb: { host: string; port: number; key: string; scheme: string } | null;
  firebase_enabled: boolean;
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type Role = 'owner' | 'manager' | 'staff';

/** Endpoints tab, GET /auth/me notes. */
export type User = {
  role: Role;
  email_verified: boolean;
  has_password: boolean;
  google_linked: boolean;
  show_password_reminder: boolean;
};

/** Start here: /auth/me "shows ... the business with its locations". Fields confirmed from capture. */
export type Business = {
  id: number;
};

/** Build guide: "Every sign-in answers with token, user, business and token_expires_at." */
export type SignInResponse = {
  token: string;
  user: User;
  business: Business;
  token_expires_at: string;
};

/** POST /auth/google/id-token: same as /auth/login plus google_handoff; is_new_user on 201. */
export type GoogleSignInResponse = SignInResponse & {
  google_handoff: null;
  is_new_user?: boolean;
};

/** POST /auth/email-code: always 200 with this shape. */
export type EmailCodeResponse = {
  message: string;
  email_masked: string;
  expires_in: number;
  resend_after: number;
};

export type SignInDeviceFields = {
  device_name: string;
  platform: DevicePlatform;
};
