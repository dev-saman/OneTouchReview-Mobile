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

  // 1b Profile
  emailVerifyCode: '/auth/email/verify-code',
  emailVerify: '/auth/email/verify',
  password: '/auth/password',
  passwordReminderDismiss: '/auth/password-reminder/dismiss',
  profileEmailCode: '/settings/profile/email-code',
  profileEmail: '/settings/profile/email',

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

  // 8 My card
  digitalCards: '/digital-cards',
  // 11 Edit card
  digitalCard: (id: number) => `/digital-cards/${id}`,
  digitalCardPhoto: (id: number) => `/digital-cards/${id}/photo`,

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
