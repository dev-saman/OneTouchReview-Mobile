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

// ---------------------------------------------------------------------------
// Shared — Sheet response examples
// ---------------------------------------------------------------------------

/** { id, name } as embedded in customers, requests and notifications. */
export type LocationRef = { id: number; name: string };

/** Cursor paging: "use next_cursor / has_more". */
export type CursorPage = { next_cursor: string | null; has_more: boolean };

// ---------------------------------------------------------------------------
// 7 Dashboard — GET /business/dashboard, GET /analytics/usage
// Plan, trial and subscription fields are sent too; the app never shows them (no billing in the app).
// ---------------------------------------------------------------------------

export type DashboardStats = {
  total_customers: number;
  total_requests_sent: number;
  total_responses: number;
  avg_rating: number | null;
  messages_quota: number | null;
  current_period_messages_used: number;
  messages_remaining: number | null;
  google_connected: boolean;
  google_reviews_count: number;
};

export type ReviewResponseSummary = {
  id: number;
  rating: number | null;
  private_feedback: string | null;
  responded_at: string | null;
};

/** recent_requests item. */
export type RecentRequest = {
  id: number;
  status: string;
  channel: string | null;
  sent_at: string | null;
  created_at: string;
  customer: { id: number; name: string } | null;
  response: ReviewResponseSummary | null;
  location: LocationRef | null;
};

export type Dashboard = {
  stats: DashboardStats;
  recent_requests: RecentRequest[];
  urgent_feedback_7d: number;
};

export type Usage = {
  period: { from: string; to: string };
  requests: { sent: number; previous_sent: number; follow_ups_sent: number };
  clicks: { page_opens: number; previous_page_opens: number };
  google_reviews: { new: number; previous_new: number; total: number; rating: number | null };
};

// ---------------------------------------------------------------------------
// 9 Clients — GET /customers, /customers/{id}, /customers/{id}/send-attempts,
// /review-requests?customer_id=
// ---------------------------------------------------------------------------

export type SmsConsent = {
  /** opted_in / opted_out / unknown in the examples. */
  status: string;
  consented_at: string | null;
  opted_out_at: string | null;
};

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  /** "Can be asked again on …" */
  next_request_allowed_at: string | null;
  /** Latest refusal. Its fields are not in the Sheet yet (docs/API-GAPS.md #14), so only null-ness is used. */
  last_not_sent: unknown;
  latest_response: ReviewResponseSummary | null;
  sms_consent: SmsConsent | null;
  email_status: { status: string } | null;
  location: LocationRef | null;
};

export type CustomersPage = CursorPage & { customers: Customer[] };

/** Endpoints notes: "Show message and source_label". */
export type SendAttempt = { message: string; source_label: string | null };

export type ReviewRequest = {
  id: number;
  status: string;
  channel: string | null;
  sent_at: string | null;
  created_at: string;
  is_reminder: boolean;
  resends_count: number;
  can_resend: boolean;
  location: LocationRef | null;
  response: ReviewResponseSummary | null;
};

export type ReviewRequestsPage = CursorPage & { review_requests: ReviewRequest[] };
