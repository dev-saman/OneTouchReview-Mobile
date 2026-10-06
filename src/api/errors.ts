import type { ApiError, ApiErrorKind } from './types';

/** Local copy used only when the server sent no message (or no response at all). */
export const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  offline: "You're offline. Check your connection and try again.",
  network: "Couldn't reach OneTouchReview. Check your connection and try again.",
  timeout: 'That took too long. Please try again.',
  cancelled: 'Cancelled.',
  unauthorized: 'Please sign in again.',
  forbidden: "You don't have access to this. Ask the owner.",
  notFound: 'This item is no longer available.',
  validation: 'Please check the highlighted fields.',
  rejected: 'That could not be done.',
  rateLimited: 'Too many tries. Please wait a moment and try again.',
  server: 'OneTouchReview is having trouble right now. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

/** Messages the docs prescribe for specific codes (Errors tab / build guide). */
const PRESCRIBED_MESSAGES: Record<string, string> = {
  // "Open OneTouchReview on the web to continue" — never a billing link.
  SUBSCRIPTION_REQUIRED: 'Open OneTouchReview on the web to continue.',
};

export function makeError(kind: ApiErrorKind, extra: Partial<Omit<ApiError, 'isApiError' | 'kind'>> = {}): ApiError {
  return {
    isApiError: true,
    kind,
    message: extra.message ?? DEFAULT_MESSAGES[kind],
    serverMessage: extra.serverMessage ?? false,
    ...extra,
  };
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && (value as ApiError).isApiError === true;
}

export function kindForStatus(status: number, code: string | undefined): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 429) return 'rateLimited';
  if (status >= 500) return 'server';
  if (status === 422 && code === 'VALIDATION_FAILED') return 'validation';
  if (status >= 400) return 'rejected';
  return 'unknown';
}

/** Retry-After is seconds (Sheet); an HTTP date is tolerated too. */
export function parseRetryAfter(value: unknown, now = Date.now()): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.ceil(value));
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - now) / 1000));
}

/** VALIDATION_FAILED details: field → messages (string or string[]). */
export function parseFieldErrors(details: unknown): Record<string, string[]> | undefined {
  if (!details || typeof details !== 'object') return undefined;
  const out: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(details as Record<string, unknown>)) {
    if (typeof value === 'string') out[field] = [value];
    else if (Array.isArray(value)) out[field] = value.filter((v): v is string => typeof v === 'string');
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Builds an ApiError from an HTTP status, the response body and the Retry-After header.
 * Body format (Sheet): { "error": { "code", "message", "details" } }.
 */
export function errorFromResponse(status: number, body: unknown, retryAfterHeader?: unknown): ApiError {
  const envelope =
    body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  const error = envelope && typeof envelope === 'object' ? (envelope as Record<string, unknown>) : {};

  const code = typeof error.code === 'string' && error.code ? error.code : undefined;
  const serverText = typeof error.message === 'string' && error.message.trim() ? error.message.trim() : undefined;
  const details =
    error.details && typeof error.details === 'object' && !Array.isArray(error.details)
      ? (error.details as Record<string, unknown>)
      : undefined;
  const kind = kindForStatus(status, code);

  const prescribed = code ? PRESCRIBED_MESSAGES[code] : undefined;
  const retryAfterSeconds =
    status === 429 ? parseRetryAfter(retryAfterHeader) ?? parseRetryAfter(details?.retry_after) : undefined;

  return makeError(kind, {
    status,
    code,
    message: prescribed ?? serverText ?? DEFAULT_MESSAGES[kind],
    serverMessage: !prescribed && !!serverText,
    details,
    fieldErrors: kind === 'validation' ? parseFieldErrors(details) : undefined,
    retryAfterSeconds,
  });
}

/**
 * Offline / timeout / no response / 5xx: keep the session and offer Retry.
 * (Never a reason to sign out.)
 */
export function isTransient(error: ApiError): boolean {
  return (
    error.kind === 'offline' ||
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (error.kind === 'server' && error.code !== 'GOOGLE_SIGNIN_OFF')
  );
}

/** Error to show for a field (VALIDATION_FAILED and the field-level codes SAME_EMAIL / EMAIL_TAKEN). */
export function fieldError(error: ApiError | null | undefined, field: string): string | undefined {
  if (!error) return undefined;
  const messages = error.fieldErrors?.[field];
  if (messages?.length) return messages[0];
  return undefined;
}
