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

/** Endpoints tab, GET /auth/me notes + response examples. */
export type User = {
  name: string;
  email: string;
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

/** GET/PUT /notification-preferences: the four documented push settings. */
export type NotificationPreferences = {
  chats: boolean;
  private_feedback: boolean;
  private_feedback_low_only: boolean;
  google_reviews: boolean;
};

/** GET /auth/sessions item: "current: true marks this phone". */
export type DeviceSession = {
  id: number;
  device_name: string | null;
  platform: DevicePlatform | string | null;
  created_at: string;
  last_used_at: string | null;
  current: boolean;
};

/** POST /auth/email-code: always 200 with this shape. */
export type EmailCodeResponse = {
  message: string;
  email_masked: string;
  expires_in: number;
  resend_after: number;
};

/**
 * 1b Profile answers (verify email, set/remove password, change email). Same user object as
 * /auth/me but without role (role is per business), so the app merges it into the stored user.
 */
export type ProfileUser = Omit<User, 'role'>;

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

// ---------------------------------------------------------------------------
// 5 Private feedback — GET /private-feedback, /private-feedback/{id}, POST /review-responses/{id}/ai-reply
// ---------------------------------------------------------------------------

export type FeedbackSource = 'request' | 'card';

export type PrivateFeedback = {
  id: number;
  source: FeedbackSource | string;
  rating: number | null;
  text: string | null;
  points: { id: number; name: string; kind: string }[] | null;
  client: { customer_id: number | null; name: string | null; phone: string | null; email: string | null } | null;
  review_request_id: number | null;
  location: LocationRef | null;
  created_at: string;
};

/** Page-based: "page" plus has_more. */
export type FeedbackPage = { feedback: PrivateFeedback[]; page: number; has_more: boolean };

// ---------------------------------------------------------------------------
// 4 Reviews — GET /google-reviews, /google-reviews/{id}, POST …/ai-reply, …/reply, …/reply-coach
// ---------------------------------------------------------------------------

export type ReviewPoint = { id: number; name: string; kind: string };

export type GoogleReview = {
  id: number;
  reviewer_name: string | null;
  reviewer_photo_url: string | null;
  rating: number | null;
  comment: string | null;
  review_time: string | null;
  reply_comment: string | null;
  reply_time: string | null;
  /** A waiting AI draft when present (null in every example). */
  ai_reply: unknown;
  points?: ReviewPoint[] | null;
  location?: LocationRef | null;
};

export type ReviewsPage = {
  reviews: GoogleReview[];
  current_page: number;
  last_page: number;
  total: number;
  filtered_total: number;
  need_reply_count: number;
  negative_count: number;
  ai_drafts: number;
  avg_rating: number | null;
};

export type ReplyResult = {
  message: string;
  posted_to_google: boolean;
  google_error: unknown;
  review: Partial<GoogleReview> & { id: number };
};

export type ReplyCoach = {
  tips: { id: string; kind: string; message: string; suggestion: string | null }[];
  improved_text: string | null;
};

// ---------------------------------------------------------------------------
// 6 Chats — GET /chats, /chats/{id}, POST …/messages, …/read, PATCH /chats/{id}, GET /chat-team, /chat-settings
// ---------------------------------------------------------------------------

export type ChatMessage = {
  id: number;
  /** visitor or business in the examples. */
  from: string;
  body: string | null;
  sender_name: string | null;
  created_at: string;
  read_at: string | null;
  delivery: { status: string; error_code: string | null } | null;
  media_count: number;
  hold_reason: unknown;
};

/** open / done (list filter values). */
export type ChatStatus = 'open' | 'done';

export type Chat = {
  id: number;
  channel: string;
  customer: { id: number; name: string } | null;
  can_reply: boolean;
  /** Why replying isn't possible; null in every example (shown only when it is text). */
  reply_block: unknown;
  reply_window_ends_at: string | null;
  location: LocationRef | null;
  visitor: { name: string | null; phone: string | null; email: string | null } | null;
  status: ChatStatus | string;
  /** null in every example; shape when assigned is not documented (docs/API-GAPS.md #23). */
  assigned_to: unknown;
  blocked: boolean;
  unread: number;
  last_message: ChatMessage | null;
  created_at: string;
  last_activity_at: string | null;
};

export type ChatsPage = { chats: Chat[]; next_cursor: string | null; unread_total: number };

// ---------------------------------------------------------------------------
// 8 My card — GET /digital-cards ("Cards with url and short_url")
// ---------------------------------------------------------------------------

export type DigitalCard = {
  id: number;
  /** "business" in the example; team members' cards are the other kind. */
  kind: string;
  enabled: boolean;
  /** false until the card is published. */
  live: boolean;
  name: string | null;
  title: string | null;
  photo_url: string | null;
  url: string | null;
  /** Drawn as the QR code and written to NFC tags. */
  short_url: string | null;
  staff_member_id: number | null;
  stats_30d: { views: number; scans: number; taps: number; chats: number; forms: number } | null;
  can_edit: boolean;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  booking_url: string | null;
  address: CardAddress | null;
  has_photo: boolean;
};

export type CardAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

/** PATCH /digital-cards/{id}: the documented editable fields only. */
export type CardChanges = Partial<
  Pick<DigitalCard, 'name' | 'title' | 'bio' | 'phone' | 'email' | 'website' | 'booking_url' | 'enabled'> & {
    address: CardAddress;
  }
>;

// ---------------------------------------------------------------------------
// 12 Reports and Ask AI — /analytics/insights, /review-points, /settings/owner-report/preview, /ai/*
// ---------------------------------------------------------------------------

export type Sentiment = { positive: number; neutral: number; negative: number; mixed: number };

export type Insights = {
  period: { from: string; to: string };
  ai_available: boolean;
  /** reviews: in the period; tagged: analysed by AI; pending: not yet. */
  coverage: { reviews: number; tagged: number; pending: number };
  sentiment: Sentiment;
  previous_sentiment: Sentiment;
};

export type ReviewPointStat = {
  id: number;
  name: string;
  kind: string;
  mentions: number;
  before: number;
  change_percent: number | null;
  /** "new" in the example. */
  trend: string | null;
  hidden: boolean;
  locations: { location_id: number; location_name: string; mentions: number }[];
  last_mentioned_at: string | null;
};

export type ReviewPoints = {
  period: string;
  ai_available: boolean;
  coverage: { items: number; tagged: number; pending: number };
  likes: ReviewPointStat[];
  dislikes: ReviewPointStat[];
};

export type ReportFrequency = 'weekly' | 'monthly';

export type OwnerReport = {
  ai_summary: string | null;
  frequency: ReportFrequency;
  period: { from: string; to: string };
  reviews: { new_count: number; new_average: number | null; rating_now: number | null; rating_before: number | null; total_count: number };
  requests: { sent: number; clicked: number; click_rate: number; previous_sent: number; previous_click_rate: number };
  private_feedback: { count: number; low_count: number };
  awaiting_reply: { count: number };
  points: {
    getting_worse: { id: number; name: string; mentions: number }[];
    getting_better: { id: number; name: string; mentions: number }[];
    still_strong: { id: number; name: string; mentions: number }[];
  };
  quiet: boolean;
};

export type AiAnswer = {
  answer: string;
  /** Shape not documented (empty in the example): only text follow-ups are shown. */
  follow_ups: unknown[];
  asks_left_today: number;
};

// ---------------------------------------------------------------------------
// 13 Notifications (bell) — GET /notifications, /notifications/unread-count, POST …/read, read-all
// ---------------------------------------------------------------------------

/** Notifications tab: urgent red, warning amber, info grey. */
export type NotificationSeverity = 'urgent' | 'warning' | 'info';

export type AppNotification = {
  id: number;
  /** private_feedback, google_review, ai_drafts, review_point_alert, google_connection, integration, sms_registration, texts_low, not_sent */
  kind: string;
  severity: NotificationSeverity | string;
  title: string;
  body: string | null;
  /** A web app path: never used to navigate (pick the screen from kind and subject). */
  url: string | null;
  count: number;
  /** null for account items. */
  location: LocationRef | null;
  /** null for rolled-up kinds. */
  subject: { type: string; id: number } | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationsPage = CursorPage & { notifications: AppNotification[]; unread_count: number };

// ---------------------------------------------------------------------------
// 2 Send request — POST /review-requests, POST /review-requests/with-customer (201)
// ---------------------------------------------------------------------------

export type SendResult = {
  message: string;
  review_request: { id: number; status: string; channel: string | null; scheduled_at: string | null };
  /** When it goes out (quiet hours / send delay); null when sent now. */
  sends_at: string | null;
  /** null in every example; shape unknown (docs/API-GAPS.md #18), shown only when it is text. */
  warning: unknown;
  /** with-customer only. */
  customer?: Customer;
  customer_created?: boolean;
};

export type NewClientInput = {
  name: string;
  phone?: string;
  email?: string;
  locationId: number;
  /** Required true when a phone is given; left out for email-only clients. */
  consentConfirmed?: boolean;
};
