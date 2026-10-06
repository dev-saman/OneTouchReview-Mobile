/**
 * The ONLY module allowed to import axios (enforced by ESLint).
 *
 * Responsibilities: base URL and headers, bearer token for authenticated calls,
 * single-flight token refresh, 401 → sign out, offline short-circuit, timeout,
 * cancellation, 429 Retry-After, error normalization, multipart upload and safe
 * development logging (method + path + status only).
 *
 * Contract (Sheet "Start here" / build guide):
 * - Always send Accept: application/json.
 * - Any 401 → clear the token and show sign-in.
 * - 5xx or no network → keep the token, show Retry.
 * - POST /auth/refresh returns a new token; the old one keeps working for 60 s.
 */
import {
  create,
  isAxiosError,
  isCancel,
  type AxiosInstance,
  type AxiosProgressEvent,
  type AxiosRequestConfig,
  type Method,
} from 'axios';

import { Config } from '@/config/env';
import { sessionEvents } from '@/services/session/sessionEvents';
import { tokenStorage } from '@/services/storage/tokenStorage';

import { DEFAULT_MESSAGES, errorFromResponse, isApiError, makeError } from './errors';
import { PUBLIC_PATHS, Paths } from './paths';
import type { ApiError } from './types';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Attach the bearer token. Defaults to true except for PUBLIC_PATHS. */
    requiresAuth?: boolean;
    _isRefresh?: boolean;
    /** Retried once with a token that rotated while this request was in flight. */
    _retriedWithNewToken?: boolean;
    /** Retried once after a short 429 Retry-After. */
    _retriedAfter429?: boolean;
    _tokenUsed?: string;
    _startedAt?: number;
  }
}

export type QueryValue = string | number | boolean | undefined | null;

export type RequestOptions = {
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
  timeout?: number;
  requiresAuth?: boolean;
};

export type UploadFile = { uri: string; name: string; type: string };

export type UploadOptions = RequestOptions & {
  onProgress?: (fraction: number) => void;
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** null = unknown (treated as online). Set by the connectivity service. */
let isOnline: boolean | null = null;

/** Single-flight refresh shared by every caller. */
let refreshInFlight: Promise<void> | null = null;

const client: AxiosInstance = create({
  baseURL: Config.apiBaseUrl,
  timeout: Config.requestTimeoutMs,
  headers: { Accept: 'application/json' },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stripQuery = (url = '') => url.split('?')[0];

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

/** Credentials only ever go to the OneTouchReview API origin. */
const isApiOrigin = (url?: string) => !url || !isAbsoluteUrl(url) || url.startsWith(`${Config.apiOrigin}/`);

const needsAuth = (config: AxiosRequestConfig) =>
  config.requiresAuth ?? !PUBLIC_PATHS.includes(stripQuery(config.url));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Drops undefined / null / '' params so they are never sent as "undefined". */
const cleanParams = (params?: Record<string, QueryValue>) => {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
};

const log = (config: AxiosRequestConfig | undefined, outcome: number | string) => {
  if (!Config.enableNetworkLogging || !config) return;
  const duration = config._startedAt ? ` ${Date.now() - config._startedAt}ms` : '';
  // Path only: queries can contain search terms (client names, phones, emails).
  console.log(`[api] ${(config.method ?? 'get').toUpperCase()} ${stripQuery(config.url)} → ${outcome}${duration}`);
};

/** Converts anything thrown by axios or this module into an ApiError. */
export function normalizeError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (isCancel(error)) return makeError('cancelled');
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') return makeError('cancelled');
    const response = error.response;
    if (!response) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return makeError('timeout');
      return makeError(isOnline === false ? 'offline' : 'network');
    }
    return errorFromResponse(response.status, response.data, response.headers?.['retry-after']);
  }
  return makeError('unknown');
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/** True when token_expires_at is known and less than the refresh window away. */
export function isRefreshDue(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry - now < Config.tokenRefreshWindowMs;
}

async function performRefresh(): Promise<void> {
  // Every authenticated request waits on this, so it must never hang (see HARD_TIMEOUT_GRACE_MS).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Config.requestTimeoutMs + 2_000);
  let response;
  try {
    response = await client.post(Paths.refresh, undefined, { _isRefresh: true, signal: controller.signal });
  } catch (error) {
    throw controller.signal.aborted ? makeError('timeout') : error;
  } finally {
    clearTimeout(timer);
  }
  const body = response.data as { token?: unknown; token_expires_at?: unknown } | undefined;
  // Field names follow the documented sign-in answer; verified against a live
  // capture before this ships (docs/API-GAPS.md). A different shape is reported, not worked around.
  if (!body || typeof body.token !== 'string' || !body.token) {
    throw makeError('unknown', { message: 'Unexpected refresh response.' });
  }
  await tokenStorage.save(body.token, typeof body.token_expires_at === 'string' ? body.token_expires_at : null);
}

/**
 * Refreshes the token when fewer than 30 days remain. Concurrent callers share one
 * request. A transient failure leaves the current token in place; a 401 signs out
 * through the normal interceptor path.
 */
export function refreshTokenIfDue(now = Date.now()): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  const stored = tokenStorage.get();
  if (!stored || !isRefreshDue(stored.expiresAt, now)) return Promise.resolve();
  refreshInFlight = performRefresh()
    .catch((error) => {
      throw normalizeError(error);
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------

client.interceptors.request.use(async (config) => {
  config._startedAt = Date.now();

  if (isOnline === false) throw makeError('offline');

  const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (!isForm && config.data !== undefined && !config.headers.has('Content-Type')) {
    config.headers.set('Content-Type', 'application/json');
  }

  if (!needsAuth(config) || !isApiOrigin(config.url)) {
    config.headers.delete('Authorization');
    return config;
  }

  // Requests issued while a refresh is running wait for the new token.
  if (refreshInFlight && !config._isRefresh) await refreshInFlight.catch(() => undefined);

  const token = tokenStorage.get()?.token;
  if (!token) throw makeError('unauthorized', { status: 401 });
  config.headers.set('Authorization', `Bearer ${token}`);
  config._tokenUsed = token;
  return config;
});

client.interceptors.response.use(
  (response) => {
    log(response.config, response.status);
    return response;
  },
  async (error: unknown) => {
    if (isApiError(error)) return Promise.reject(error);
    if (!isAxiosError(error)) return Promise.reject(normalizeError(error));

    const config = error.config;
    const status = error.response?.status;
    log(config, status ?? error.code ?? 'ERR');
    const apiError = normalizeError(error);

    if (status === 401 && config && needsAuth(config)) {
      const current = tokenStorage.get()?.token;
      // The token rotated (refresh) while this request was in flight: retry once with the new one.
      if (current && config._tokenUsed && current !== config._tokenUsed && !config._retriedWithNewToken) {
        config._retriedWithNewToken = true;
        config.headers.set('Authorization', `Bearer ${current}`);
        config._tokenUsed = current;
        return client.request(config);
      }
      // The token this request used is the current one → it is dead. Sign out once.
      if (current && config._tokenUsed === current) {
        await tokenStorage.clear().catch(() => undefined);
        sessionEvents.emit('unauthorized');
      }
      return Promise.reject(apiError);
    }

    if (status === 403 && apiError.code === 'BUSINESS_SUSPENDED') {
      sessionEvents.emit('suspended', { message: apiError.message });
    }

    // Errors tab: 429 → wait Retry-After and retry once. Only for reads, only for short waits.
    if (
      status === 429 &&
      config &&
      (config.method ?? 'get').toLowerCase() === 'get' &&
      !config._retriedAfter429 &&
      apiError.retryAfterSeconds !== undefined &&
      apiError.retryAfterSeconds <= Config.maxAutoRetryAfterSeconds
    ) {
      config._retriedAfter429 = true;
      await wait(apiError.retryAfterSeconds * 1000);
      return client.request(config);
    }

    return Promise.reject(apiError);
  },
);

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * Hard deadline enforced in JS. Android's native timeout does not cover a stalled DNS
 * lookup, so without this a request on a broken network can hang forever (seen on an
 * emulator with dead DNS: neither axios nor a raw XHR timeout ever fired).
 */
const HARD_TIMEOUT_GRACE_MS = 2_000;

async function send<T>(
  method: Method,
  url: string,
  data: unknown,
  options: RequestOptions & { onUploadProgress?: (event: AxiosProgressEvent) => void } = {},
): Promise<T> {
  const timeout = options.timeout ?? Config.requestTimeoutMs;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout + HARD_TIMEOUT_GRACE_MS);
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener('abort', forwardAbort);
  if (options.signal?.aborted) controller.abort();

  try {
    const response = await client.request<T>({
      method,
      url,
      data,
      ...options,
      timeout,
      signal: controller.signal,
      params: cleanParams(options.params),
    });
    return response.data;
  } catch (error) {
    if (timedOut) throw makeError('timeout');
    throw normalizeError(error);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', forwardAbort);
  }
}

export const network = {
  get: <T>(url: string, options?: RequestOptions) => send<T>('get', url, undefined, options),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) => send<T>('post', url, body, options),
  put: <T>(url: string, body?: unknown, options?: RequestOptions) => send<T>('put', url, body, options),
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) => send<T>('patch', url, body, options),
  delete: <T>(url: string, options: RequestOptions & { body?: unknown } = {}) => {
    const { body, ...rest } = options;
    return send<T>('delete', url, body, rest);
  },

  /** multipart/form-data. React Native sets the boundary; never set Content-Type manually. */
  upload: <T>(
    url: string,
    { file, fileField, fields }: { file: UploadFile; fileField: string; fields?: Record<string, QueryValue> },
    { onProgress, ...options }: UploadOptions = {},
  ) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields ?? {})) {
      if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
    }
    form.append(fileField, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    return send<T>('post', url, form, {
      timeout: Config.uploadTimeoutMs,
      ...options,
      onUploadProgress: onProgress
        ? (event) => {
            if (event.total) onProgress(Math.min(1, event.loaded / event.total));
          }
        : undefined,
    });
  },

  refreshTokenIfDue,

  /** Called by the connectivity service. */
  setOnline(value: boolean | null) {
    isOnline = value;
  },

  isOnline: () => isOnline !== false,

  normalizeError,
  defaultMessages: DEFAULT_MESSAGES,
};

/** Tests only: swap the transport. */
export const __testing = {
  client,
  reset() {
    isOnline = null;
    refreshInFlight = null;
  },
};
