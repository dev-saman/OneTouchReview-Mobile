/**
 * Every path the app calls. Only paths listed in the Sheet's Endpoints tab belong here.
 * Paths are relative to Config.apiBaseUrl.
 */
export const Paths = {
  appConfig: '/app-config',

  // 1 Sign in
  login: '/auth/login',
  emailCode: '/auth/email-code',
  emailCodeVerify: '/auth/email-code/verify',
  googleIdToken: '/auth/google/id-token',
  forgotPassword: '/auth/forgot-password',
  refresh: '/auth/refresh',
  me: '/auth/me',
  logout: '/auth/logout',
  sessions: '/auth/sessions',
  session: (id: number) => `/auth/sessions/${id}`,

  // 1b Profile
  emailVerifyCode: '/auth/email/verify-code',
  emailVerify: '/auth/email/verify',
  password: '/auth/password',
  passwordReminderDismiss: '/auth/password-reminder/dismiss',
  profileEmailCode: '/settings/profile/email-code',
  profileEmail: '/settings/profile/email',

  // 3 Push
  devices: '/devices',
  device: (id: number) => `/devices/${id}`,
  notificationPreferences: '/notification-preferences',

  // 10 Locations
  locations: '/locations',

  // 7 Dashboard
  dashboard: '/business/dashboard',
  usage: '/analytics/usage',

  // 9 Clients
  customers: '/customers',
  customer: (id: number) => `/customers/${id}`,
  customerSendAttempts: (id: number) => `/customers/${id}/send-attempts`,
  reviewRequests: '/review-requests',
  reviewRequestsWithCustomer: '/review-requests/with-customer',
  reviewRequestResend: (id: number) => `/review-requests/${id}/resend`,

  // 4 Reviews
  googleReviews: '/google-reviews',
  googleReview: (id: number) => `/google-reviews/${id}`,
  googleReviewAiReply: (id: number) => `/google-reviews/${id}/ai-reply`,
  googleReviewReply: (id: number) => `/google-reviews/${id}/reply`,
  googleReviewReplyCoach: (id: number) => `/google-reviews/${id}/reply-coach`,
  googleReviewChanges: (id: number) => `/google-reviews/${id}/changes`,
  googleReviewTags: (id: number) => `/google-reviews/${id}/tags`,
  googleReviewNotes: (id: number) => `/google-reviews/${id}/notes`,

  // 4 Reviews (all sites)
  siteReviews: '/site-reviews',
  siteReview: (id: number) => `/site-reviews/${id}`,
  siteReviewAiReply: (id: number) => `/site-reviews/${id}/ai-reply`,
  siteReviewReply: (id: number) => `/site-reviews/${id}/reply`,
  siteReviewTags: (id: number) => `/site-reviews/${id}/tags`,
  siteReviewNotes: (id: number) => `/site-reviews/${id}/notes`,
  locationReviewProfiles: (locationId: number) => `/locations/${locationId}/review-profiles`,
  reviewsSummary: '/reviews/summary',
  reviewsSummaryRefresh: '/reviews/summary/refresh',
  reviewTags: '/review-tags',
  reviewNote: (id: number) => `/review-notes/${id}`,
  reviewShield: '/review-shield',
  reviewShieldFlag: (id: number) => `/review-shield/${id}`,

  // 5 Private feedback
  privateFeedback: '/private-feedback',
  privateFeedbackItem: (id: number) => `/private-feedback/${id}`,
  reviewResponseAiReply: (id: number) => `/review-responses/${id}/ai-reply`,

  // 6 Chats
  chats: '/chats',
  chat: (id: number) => `/chats/${id}`,
  chatMessages: (id: number) => `/chats/${id}/messages`,
  chatRead: (id: number) => `/chats/${id}/read`,
  chatSettings: '/chat-settings',
  chatTeam: '/chat-team',
  /** Realtime: Pusher-protocol channel auth for Reverb. */
  broadcastingAuth: '/broadcasting/auth',

  // 8 My card
  digitalCards: '/digital-cards',
  digitalCardStats: (id: number) => `/digital-cards/${id}/stats`,
  digitalCardInsights: (id: number) => `/digital-cards/${id}/insights`,
  digitalCardSuggestionApply: (id: number, insightId: number, key: string) =>
    `/digital-cards/${id}/insights/${insightId}/suggestions/${encodeURIComponent(key)}/apply`,
  digitalCardSuggestionDismiss: (id: number, insightId: number, key: string) =>
    `/digital-cards/${id}/insights/${insightId}/suggestions/${encodeURIComponent(key)}/dismiss`,
  // 11 Edit card
  digitalCard: (id: number) => `/digital-cards/${id}`,
  digitalCardPhoto: (id: number) => `/digital-cards/${id}/photo`,
  digitalCardSlugAvailable: '/digital-cards/slug-available',
  /** The business card's address (location and member cards use PATCH /digital-cards/{id}). */
  digitalCardBusinessSlug: '/digital-cards/slug',
  digitalCardGallery: (id: number) => `/digital-cards/${id}/gallery`,
  digitalCardGalleryItem: (id: number, itemId: number) => `/digital-cards/${id}/gallery/${itemId}`,
  digitalCardVideos: (id: number) => `/digital-cards/${id}/videos`,
  digitalCardBrochures: (id: number) => `/digital-cards/${id}/brochures`,
  digitalCardBrochure: (id: number, itemId: number) => `/digital-cards/${id}/brochures/${itemId}`,

  // 12 Reports
  insights: '/analytics/insights',
  reviewPoints: '/review-points',
  reviewPoint: (id: number) => `/review-points/${id}`,
  ownerReportPreview: '/settings/owner-report/preview',
  attribution: '/analytics/attribution',
  attributionReviews: '/analytics/attribution/reviews',
  followUpResults: '/follow-ups/results',
  aiStatus: '/ai/status',
  aiAsk: '/ai/ask',
  aiAskSuggestions: '/ai/ask/suggestions',

  // 15 Card assistant
  assistantConversations: '/assistant/conversations',
  assistantConversation: (id: number) => `/assistant/conversations/${id}`,
  assistantMessageCorrection: (id: number) => `/assistant/messages/${id}/correction`,
  assistantBookings: '/assistant/bookings',
  assistantBookingConfirm: (id: number) => `/assistant/bookings/${id}/confirm`,
  assistantBookingSuggest: (id: number) => `/assistant/bookings/${id}/suggest`,
  assistantTraining: '/assistant/training',
  assistantTrainingAnswer: (id: number) => `/assistant/training/${id}/answer`,
  assistantTrainingDismiss: (id: number) => `/assistant/training/${id}/dismiss`,
  assistantReport: '/assistant/report',

  // 16 Leads (ids are strings: c5 = chat, a7 = assistant conversation)
  leads: '/leads',
  leadAddClient: (id: string) => `/leads/${encodeURIComponent(id)}/add-client`,

  // 17 Google profile approvals
  googleProfileChanges: (locationId: number) => `/locations/${locationId}/google-profile/changes`,
  googleProfileChangeApprove: (changeId: number) => `/google-profile/changes/${changeId}/approve`,
  googleProfileChangeDecline: (changeId: number) => `/google-profile/changes/${changeId}/decline`,
  googleProfileChangeUndo: (changeId: number) => `/google-profile/changes/${changeId}/undo`,

  // 13 Notifications (bell)
  notifications: '/notifications',
  notificationsUnreadCount: '/notifications/unread-count',
  notificationRead: (id: number) => `/notifications/${id}/read`,
  notificationsReadAll: '/notifications/read-all',
} as const;

/** Called without a bearer token. */
export const PUBLIC_PATHS: readonly string[] = [
  Paths.appConfig,
  Paths.login,
  Paths.emailCode,
  Paths.emailCodeVerify,
  Paths.googleIdToken,
  Paths.forgotPassword,
];
