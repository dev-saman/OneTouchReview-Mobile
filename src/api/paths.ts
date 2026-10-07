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
  reviewRequestResend: (id: number) => `/review-requests/${id}/resend`,
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
