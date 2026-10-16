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

/** GET/PUT /notification-preferences: the six item push switches (Push tab notes, 2026-10-14). */
export type NotificationPreferences = {
  chats: boolean;
  private_feedback: boolean;
  private_feedback_low_only: boolean;
  google_reviews: boolean;
  /** "New reviews from other sites" (site_review push). */
  site_reviews: boolean;
  /** "Google review changed or removed" (google_review_changed push), default on. */
  review_changes: boolean;
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

/** rating_projection.locations[] (Dashboard tab tile 5). */
export type RatingProjection = {
  location_id: number;
  location_name: string;
  rating: number | null;
  shown_rating: number | null;
  count: number;
  at_top: boolean;
  targets: { rating: number; five_star_needed: number }[];
  pace: { reviews_90d: number; five_star_share: number | null; months_to_next: number | null } | null;
};

/** competitors[] (Dashboard tab tile 11). */
export type CompetitorStats = { rating: number | null; review_count: number; new_reviews_30d: number };

export type DashboardCompetitors = {
  location_id: number;
  location_name: string;
  own: CompetitorStats;
  competitors: (CompetitorStats & { name: string })[];
};

/**
 * "Keys that don't apply are left out, so treat each as optional" (Endpoints notes, row 43).
 * google_profile[].changes_waiting and review_shield.open are owners and managers only.
 */
export type Dashboard = {
  stats: DashboardStats;
  recent_requests: RecentRequest[];
  urgent_feedback_7d: number;
  rating_projection?: { locations: RatingProjection[] } | null;
  google_profile?: { location_id: number; location_name: string; changes_waiting: number }[] | null;
  review_shield?: { open: number } | null;
  competitors?: DashboardCompetitors[] | null;
};

export type Usage = {
  period: { from: string; to: string };
  requests: { sent: number; previous_sent: number; follow_ups_sent: number };
  /** Dashboard tab tile 6 reads total / previous_total ("Link clicks"). */
  clicks: { page_opens: number; previous_page_opens: number; total?: number; previous_total?: number };
  google_reviews: { new: number; previous_new: number; total: number; rating: number | null };
  cards?: { scans: number; previous_scans: number; clicks: number; previous_clicks: number };
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
  /** When the client was added. */
  created_at: string;
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
  /** Top-level urgent flag (API-GAPS #21). */
  urgent?: boolean;
  /** null until AI has read the item (API-GAPS #21). `flags` is not used by the app. */
  triage?: { urgent: boolean; summary: string | null; read_at: string | null } | null;
};

/** Page-based: "page" plus has_more. */
export type FeedbackPage = { feedback: PrivateFeedback[]; page: number; has_more: boolean };

// ---------------------------------------------------------------------------
// 4 Reviews — GET /google-reviews, /google-reviews/{id}, POST …/ai-reply, …/reply, …/reply-coach
// ---------------------------------------------------------------------------

export type ReviewPoint = { id: number; name: string; kind: string };

export type AiReply = {
  status: string;
  text: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  reason: string | null;
};

/** last_change on a review (row 69): edited, removed or restored. */
export type ReviewChangeKind = 'edited' | 'removed' | 'restored' | string;

export type ReviewTag = { id: number; name: string; color: string; reviews_count?: number };

export type GoogleReview = {
  id: number;
  reviewer_name: string | null;
  reviewer_photo_url: string | null;
  rating: number | null;
  comment: string | null;
  review_time: string | null;
  reply_comment: string | null;
  reply_time: string | null;
  /** The AI reply for this review, or null (API-GAPS #22). A waiting draft has status "draft". */
  ai_reply: AiReply | null;
  points?: ReviewPoint[] | null;
  location?: LocationRef | null;
  /** Not null: show "Removed from Google" (row 69). */
  removed_at?: string | null;
  last_change?: { kind: ReviewChangeKind; detected_at: string; old_rating: number | null; new_rating: number | null } | null;
  tags?: ReviewTag[];
  notes_count?: number;
};

/** GET /google-reviews/{id}/changes item, newest first. */
export type ReviewChange = {
  id: number;
  kind: ReviewChangeKind;
  detected_at: string;
  old_rating: number | null;
  new_rating: number | null;
  old_text: string | null;
  new_text: string | null;
  reply_may_need_update: boolean;
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
  /** status=changed: a change in 90 days; status=removed: removed from Google (row 69). */
  changed_count?: number;
  removed_count?: number;
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
/** GET /chat-team: people a chat can be assigned to. */
export type ChatTeamMember = { id: number; name: string; role: Role | string };

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
  /** Who the chat is assigned to, or null (API-GAPS #23). */
  assigned_to: { id: number; name: string } | null;
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

export type CardKind = 'business' | 'location' | 'member';

export type DigitalCard = {
  id: number;
  kind: CardKind | string;
  location_id: number | null;
  /** The card address; null until set. */
  slug: string | null;
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
  /** Open weekly suggestions (row 116, Dashboard tile 10). */
  insight_open?: number;
  /** Gallery, videos and brochures can be edited (rows 105–111). */
  media_available?: boolean;
  gallery?: CardGalleryItem[];
  videos?: CardVideo[];
  brochures?: CardBrochure[];
};

export type CardGalleryItem = { id: number; url: string; thumb_url: string; caption: string | null; width: number; height: number };
export type CardVideo = { id: number; provider: string; video_id: string; url: string; title: string | null; thumb_url: string | null };
export type CardBrochure = { id: number; name: string; url: string; size_bytes: number };

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
    /** Location and member cards only; the business card uses PUT /digital-cards/slug. */
    slug: string;
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
  /** Item shapes from API-GAPS #28. */
  themes: InsightTheme[];
  staff: InsightStaff[];
  locations: InsightLocation[];
};

export type InsightTheme = {
  key: string;
  label: string;
  mentions: number;
  positive: number;
  negative: number;
  previous_mentions: number;
  previous_negative: number;
};

export type InsightStaff = {
  staff_member_id: number;
  name: string;
  location_id: number | null;
  location_name: string | null;
  mentions: number;
  positive: number;
  negative: number;
  previous_mentions: number;
};

export type InsightLocation = {
  id: number;
  name: string;
  reviews: number;
  positive: number;
  negative: number;
  /** Shape not documented beyond the name: shown only when it is text. */
  top_theme: unknown;
  top_complaint: unknown;
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

/** POST /ai/ask history turn (API-GAPS #27). */
export type AiHistoryTurn = { role: 'user' | 'assistant'; content: string };

export type AiAnswer = {
  answer: string;
  /** Web-app paths, up to 4 (API-GAPS #27). */
  links: { label: string; path: string }[];
  /** Up to 3 suggested next questions. */
  follow_ups: string[];
  /** Data tool names; display / debug only, not used by the app. */
  used: string[];
  asks_left_today: number;
};

// ---------------------------------------------------------------------------
// 13 Notifications (bell) — GET /notifications, /notifications/unread-count, POST …/read, read-all
// ---------------------------------------------------------------------------

/** Notifications tab: urgent red, warning amber, info grey. */
export type NotificationSeverity = 'urgent' | 'warning' | 'info';

export type AppNotification = {
  id: number;
  /** Notifications tab, incl. the kinds added October 14 (site_review, assistant, google_profile …). */
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
  /** e.g. assistant.handoff, google_profile.approval_needed; null for client items and older rows. */
  event?: string | null;
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
  /** DAILY_LIMIT_NEAR | DAILY_LIMIT_REACHED or null (API-GAPS #18). The send still succeeded. */
  warning: string | null;
  /** with-customer only. */
  customer?: Customer;
  customer_created?: boolean;
};

/** POST /review-requests channel: auto (text when possible, else email), sms or email. */
export type ReviewChannel = 'auto' | 'sms' | 'email';

export type NewClientInput = {
  name: string;
  phone?: string;
  email?: string;
  locationId: number;
  /** Required true when a phone is given; left out for email-only clients. */
  consentConfirmed?: boolean;
  channel?: ReviewChannel;
};

// ---------------------------------------------------------------------------
// 4 Reviews (all sites) — rows 70–85, 115. Sites come from the API: never a hardcoded list.
// ---------------------------------------------------------------------------

/** Our posted reply on a site review. can_edit: it can be deleted from the app. */
export type SiteOwnerResponse = { text: string; posted_on: string | null; can_edit: boolean };

export type SiteReview = {
  id: number;
  /** A key such as "yelp"; an unknown key gets the generic star icon. */
  platform: string;
  platform_name: string;
  location: LocationRef | null;
  profile: { id: number; name: string | null } | null;
  reviewer_first_name: string | null;
  /** null on recommend-only sites: show recommends. */
  rating: number | null;
  recommends: boolean | null;
  title: string | null;
  body: string | null;
  posted_on: string | null;
  /** Opens the review on the site. */
  url: string | null;
  /** Where to paste a reply when can_reply is false. */
  reply_url: string | null;
  owner_response: SiteOwnerResponse | null;
  /** Posting from the app (today Facebook only). */
  can_reply: boolean;
  points: ReviewPoint[];
  tags: ReviewTag[];
  notes_count: number;
};

/** by_profile[]: one per connected site profile. */
export type SiteProfileSummary = {
  profile_id: number;
  name: string | null;
  platform: string;
  count: number;
  average_rating: number | null;
  site_rating?: number | null;
  site_review_count?: number | null;
  site_rating_kind: string;
  importing: boolean;
  import_note: string | null;
};

export type SiteReviewsPage = {
  reviews: SiteReview[];
  total: number;
  current_page: number;
  last_page: number;
  by_profile: SiteProfileSummary[];
};

/** POST /site-reviews/{id}/ai-reply: copy it and "Open on {platform_name} to paste". */
export type SiteAiReply = {
  reply: string;
  fallback: boolean;
  reason: string | null;
  reply_url: string | null;
  language: string;
  message?: string;
};

/** GET /locations/{id}/review-profiles?platform=all (only the fields the app reads). */
export type ReviewProfiles = {
  profiles: {
    id: number;
    platform: string;
    platform_name: string;
    status: string;
    sync_state: string;
    reviews: number;
    average_rating: number | null;
    site_rating: number | null;
    import: { note: string | null } | null;
  }[];
  /** Every site the server knows: use it for tab labels. */
  platforms: { key: string; name: string; enabled: boolean }[];
};

export type SummarySource = 'all' | 'google' | 'sites';

export type ReviewsSummary = {
  summary: {
    text: string;
    praised: string[];
    complaints: string[];
    based_on: { reviews: number; from: string; to: string };
    generated_at: string;
  } | null;
  /** NOT_ENOUGH_REVIEWS, AI_OFF, AI_PAUSED, AI_UNAVAILABLE or null. */
  reason: string | null;
};

export type TagColor = 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export type ReviewNote = {
  id: number;
  body: string;
  user: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
};

export type ReviewShieldStatus = 'open' | 'reported' | 'appealed' | 'kept' | 'kept_final' | 'removed' | 'dismissed';

/** GET /review-shield/{id}: read-only in the app; reporting (guide) is web only. */
export type ReviewShieldFlag = {
  id: number;
  status: ReviewShieldStatus | string;
  category_label: string;
  google_reason: string | null;
  confidence: number | null;
  explanation: string | null;
  quote: string | null;
  flagged_at: string;
  review: {
    id: number;
    location_name: string | null;
    reviewer_name: string | null;
    rating: number | null;
    comment: string | null;
    review_time: string | null;
    reply_comment: string | null;
    removed_at: string | null;
  };
};

// ---------------------------------------------------------------------------
// 15 Card assistant — rows 86–95. Pro only: 403 PLAN_REQUIRED hides the screen.
// ---------------------------------------------------------------------------

export type AssistantState = 'answering' | 'needs_details' | 'handed_off' | 'limit' | 'closed';

export type AssistantConversation = {
  id: number;
  card: { id: number; name: string } | null;
  started_at: string;
  messages_count: number;
  state: AssistantState | string;
  handed_off: boolean;
  booking: boolean;
  thumbs: { up: number; down: number };
  first_question: string | null;
  visitor_name: string | null;
  last_activity_at: string | null;
  /** card | widget */
  channel: string;
  page_title: string | null;
};

export type AssistantConversationDetail = AssistantConversation & {
  visitor: { name: string | null; phone: string | null; email: string | null } | null;
  /** A handed-off conversation is also a chat: reply there. */
  chat_id: number | null;
};

export type AssistantMessage = {
  id: number;
  /** assistant | visitor | team | system */
  from: string;
  text: string | null;
  sender_name: string | null;
  created_at: string;
  correction: unknown;
};

export type AssistantConversationsPage = CursorPage & { conversations: AssistantConversation[] };

/** The saved answer from a correction or a training reply. */
export type AssistantAnswer = { id: number; question: string; answer: string; source: string; updated_at: string };

export type BookingStatus = 'new' | 'confirmed' | 'suggested' | 'declined';

export type AssistantBooking = {
  id: number;
  service: string | null;
  /** UTC; show it in the booking's timezone. */
  requested_at: string;
  timezone: string | null;
  visitor: { name: string | null; phone: string | null; email: string | null };
  note: string | null;
  status: BookingStatus | string;
  suggested_at: string | null;
  card: { id: number; name: string } | null;
  conversation_id: number | null;
  chat_id: number | null;
  created_at: string;
};

export type BookingResult = { booking: AssistantBooking; emailed: boolean };

export type BotScore = { percent: number; answered: number; usual_total: number };

export type TrainingQuestion = { id: number; kind: string; text: string; asked_count: number; week: string };

export type AssistantTraining = { questions: TrainingQuestion[]; score: BotScore };

export type AssistantReport = {
  week: string;
  conversations: number;
  answered_alone: number;
  handed_off: number;
  booking_requests: number;
  thumbs: { up: number; down: number };
  top_topics: string[];
  by_channel: { card: number; widget: number };
};

// ---------------------------------------------------------------------------
// 16 Leads — rows 96–97
// ---------------------------------------------------------------------------

export type LeadSource = 'assistant_card' | 'assistant_website' | 'card_chat' | 'card_form' | 'booking';

export type Lead = {
  /** A string: c5 = chat, a7 = assistant conversation. */
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  /** false: "Phone given by the visitor (not verified)". */
  phone_verified: boolean;
  source: LeadSource | string;
  card: { id: number; name: string } | null;
  location: LocationRef | null;
  topic: string | null;
  first_question: string | null;
  chat_id: number | null;
  conversation_id: number | null;
  customer_id: number | null;
  status: string;
  created_at: string;
  last_activity_at: string | null;
};

export type LeadsPage = CursorPage & {
  leads: Lead[];
  counts: { total: number; by_source: Record<string, number> };
};

// ---------------------------------------------------------------------------
// 17 Google profile approvals — rows 98–101. Pro only. Editing the profile is web only.
// ---------------------------------------------------------------------------

export type ChangeRisk = 'safe' | 'careful' | 'risky';

export type GoogleProfileChange = {
  id: number;
  location_id: number;
  /** e.g. description, primary_category, hours (response example). */
  field?: string;
  field_label: string;
  risk?: ChangeRisk | string;
  /** Plain words: show these. */
  before_text: string | null;
  after_text: string | null;
  source_label: string | null;
  status: string;
  status_label: string;
  waiting_reason: string | null;
  expires_at: string | null;
  can: { approve: boolean; decline: boolean; cancel: boolean; undo: boolean };
};

export type GoogleProfileChanges = {
  available: boolean;
  enabled: boolean;
  connected: boolean;
  queue: { paused: boolean; reason_text: string | null; pending_count: number } | null;
  waiting: GoogleProfileChange[];
  queued: GoogleProfileChange[];
  in_progress: GoogleProfileChange[];
  history: GoogleProfileChange[];
  next_cursor: string | null;
};

// ---------------------------------------------------------------------------
// 8 My card insights and stats, 11 card media — rows 46, 102–111
// ---------------------------------------------------------------------------

export type CardSuggestion = { key: string; title: string; reason: string | null; status: string };

export type CardInsight = {
  id: number;
  week: string;
  summary: string | null;
  stats: { views: number; scans: number; taps: Record<string, number>; views_before: number } | null;
  suggestions: CardSuggestion[];
};

export type CardInsights = {
  /** false (plan): hide. */
  available: boolean;
  /** false: "We need {needed} visits a week for a summary". */
  enough_visits: boolean;
  views_this_week: number;
  needed: number;
  latest: CardInsight | null;
  history: CardInsight[];
};

/** GET /digital-cards/{id}/stats (30 days). */
export type CardStats = { period: string; views: number; scans: number; taps: Record<string, number>; chats: number; forms: number };

// ---------------------------------------------------------------------------
// 12 Reports — attribution and follow-up results (rows 112–114)
// ---------------------------------------------------------------------------

export type Attribution = {
  period: { from: string; to: string };
  activity: { sent: number; delivered: number; clicked: number; card_scans: number; card_review_taps: number };
  reviews: { total: number; likely: { high: number; medium: number; low: number; total: number }; unlinked: number };
  weeks: { week: string; reviews: number; likely: number; unlinked: number }[];
  /** Shown as it is. */
  note: string;
};

export type AttributionReview = {
  google_review_id: number;
  reviewer_name: string | null;
  rating: number | null;
  review_time: string;
  location: LocationRef | null;
  status: string;
  confidence: string | null;
  /** Plain words: shown as it is. */
  reason: string | null;
  /** customer is null for staff. */
  request: { id: number; customer: { id: number; name: string } | null } | null;
};

export type AttributionReviewsPage = { reviews: AttributionReview[]; next_cursor: string | null };

/** Rates are percents; null with fewer than 10 sends (show "–"). */
export type FollowUpResults = {
  period: { from: string; to: string };
  totals: { first_messages: number; follow_ups_sent: number; opened: number; tapped: number; outcome_rate: number | null };
  by_channel: Record<string, { sent: number; outcome_rate: number | null }>;
  by_step: { step: number; channel: string; sent: number; outcome_rate: number | null }[];
  by_wording: { template_id: number; name: string; channel: string; sent: number; outcome_rate: number | null }[];
  by_hour: { slot: string; sent: number; outcome_rate: number | null }[];
  new_google_reviews: number;
  note: string;
};
