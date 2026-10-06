import { __testing, isRefreshDue, network } from '@/api/network';
import { sessionEvents } from '@/services/session/sessionEvents';
import { tokenStorage } from '@/services/storage/tokenStorage';

import { authHeader, mockHttp } from '../../../tests/httpMock';

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

beforeEach(async () => {
  __testing.reset();
  tokenStorage.__resetForTests();
  (jest.requireMock('expo-secure-store') as { __reset: () => void }).__reset();
});

describe('request basics', () => {
  it('always sends Accept: application/json and the bearer token on authenticated calls', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    const calls = mockHttp(() => ({ status: 200, data: { ok: true } }));
    await network.get('/auth/me');
    expect(calls[0].headers.Accept).toBe('application/json');
    expect(authHeader(calls[0])).toBe('Bearer tok-1');
  });

  it('never sends the token to public endpoints', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    const calls = mockHttp(() => ({ status: 200, data: {} }));
    await network.get('/app-config');
    await network.post('/auth/email-code', { email: 'a@example.com', purpose: 'login' });
    expect(authHeader(calls[0])).toBeUndefined();
    expect(authHeader(calls[1])).toBeUndefined();
  });

  it('drops empty query params', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    const calls = mockHttp(() => ({ status: 200, data: {} }));
    await network.get('/customers', { params: { search: '', location_id: 1497, cursor: undefined } });
    expect(calls[0].params).toEqual({ location_id: 1497 });
  });
});

describe('401 / 5xx / offline', () => {
  it('401 clears the token and signals sign-out exactly once', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    const onUnauthorized = jest.fn();
    const off = sessionEvents.on('unauthorized', onUnauthorized);
    mockHttp(() => ({ status: 401, data: { error: { code: 'UNAUTHENTICATED', message: 'Expired' } } }));

    await expect(network.get('/auth/me')).rejects.toMatchObject({ kind: 'unauthorized' });
    await expect(network.get('/locations')).rejects.toMatchObject({ kind: 'unauthorized' });

    expect(tokenStorage.get()).toBeNull();
    expect(await tokenStorage.load()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    off();
  });

  it('5xx keeps the token and the session', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    const onUnauthorized = jest.fn();
    const off = sessionEvents.on('unauthorized', onUnauthorized);
    mockHttp(() => ({ status: 503, data: '<html>' }));

    await expect(network.get('/auth/me')).rejects.toMatchObject({ kind: 'server', status: 503 });
    expect(tokenStorage.get()?.token).toBe('tok-1');
    expect(onUnauthorized).not.toHaveBeenCalled();
    off();
  });

  it('offline: the request is never sent and the token is kept', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    network.setOnline(false);
    const calls = mockHttp(() => ({ status: 200, data: {} }));

    await expect(network.get('/auth/me')).rejects.toMatchObject({ kind: 'offline' });
    expect(calls).toHaveLength(0);
    expect(tokenStorage.get()?.token).toBe('tok-1');
  });

  it('a dropped connection is a network error, not a sign-out', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    mockHttp(() => 'network-error');
    await expect(network.get('/auth/me')).rejects.toMatchObject({ kind: 'network' });
    expect(tokenStorage.get()?.token).toBe('tok-1');
  });

  it('403 BUSINESS_SUSPENDED is announced', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    const onSuspended = jest.fn();
    const off = sessionEvents.on('suspended', onSuspended);
    mockHttp(() => ({ status: 403, data: { error: { code: 'BUSINESS_SUSPENDED', message: 'Suspended.' } } }));
    await expect(network.get('/auth/me')).rejects.toMatchObject({ code: 'BUSINESS_SUSPENDED' });
    expect(onSuspended).toHaveBeenCalledWith({ message: 'Suspended.' });
    off();
  });

  it('403 FORBIDDEN does not sign out', async () => {
    await tokenStorage.save('tok-1', inDays(80));
    mockHttp(() => ({ status: 403, data: { error: { code: 'FORBIDDEN', message: 'Owners only.' } } }));
    await expect(network.post('/review-requests/1/resend')).rejects.toMatchObject({ kind: 'forbidden' });
    expect(tokenStorage.get()?.token).toBe('tok-1');
  });
});

describe('token refresh', () => {
  it('is due only when fewer than 30 days remain', () => {
    const now = Date.parse('2026-10-06T00:00:00Z');
    expect(isRefreshDue('2026-12-01T00:00:00Z', now)).toBe(false); // 56 days
    expect(isRefreshDue('2026-10-20T00:00:00Z', now)).toBe(true); // 14 days
    expect(isRefreshDue(null, now)).toBe(false);
    expect(isRefreshDue('not a date', now)).toBe(false);
  });

  it('does nothing when the token has more than 30 days left', async () => {
    await tokenStorage.save('tok-1', inDays(60));
    const calls = mockHttp(() => ({ status: 200, data: {} }));
    await network.refreshTokenIfDue();
    expect(calls).toHaveLength(0);
  });

  it('concurrent callers share one refresh and later requests use the new token', async () => {
    await tokenStorage.save('old', inDays(5));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const calls = mockHttp(async (config) => {
      if (config.url === '/auth/refresh') {
        await gate;
        return { status: 200, data: { token: 'new', token_expires_at: inDays(90) } };
      }
      return { status: 200, data: {} };
    });

    const a = network.refreshTokenIfDue();
    const b = network.refreshTokenIfDue();
    const request = network.get('/locations'); // issued during the refresh
    release();
    await Promise.all([a, b, request]);

    expect(calls.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
    expect(authHeader(calls.find((c) => c.url === '/auth/refresh')!)).toBe('Bearer old');
    expect(authHeader(calls.find((c) => c.url === '/locations')!)).toBe('Bearer new');
    expect(tokenStorage.get()?.token).toBe('new');
  });

  it('a request that used the old token and got 401 after rotation is retried once, not signed out', async () => {
    await tokenStorage.save('old', inDays(80));
    const onUnauthorized = jest.fn();
    const off = sessionEvents.on('unauthorized', onUnauthorized);
    let first = true;
    mockHttp(async (config) => {
      if (first) {
        first = false;
        // Simulate another flow rotating the token while this request was in flight.
        await tokenStorage.save('new', inDays(90));
        return { status: 401, data: {} };
      }
      return { status: 200, data: { seen: authHeader(config) } };
    });

    await expect(network.get('/auth/me')).resolves.toEqual({ seen: 'Bearer new' });
    expect(onUnauthorized).not.toHaveBeenCalled();
    off();
  });

  it('a transient refresh failure keeps the existing token', async () => {
    await tokenStorage.save('old', inDays(5));
    mockHttp(() => ({ status: 502, data: {} }));
    await expect(network.refreshTokenIfDue()).rejects.toMatchObject({ kind: 'server' });
    expect(tokenStorage.get()?.token).toBe('old');
  });

  it('a 401 on refresh signs out', async () => {
    await tokenStorage.save('old', inDays(5));
    mockHttp(() => ({ status: 401, data: {} }));
    await expect(network.refreshTokenIfDue()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(tokenStorage.get()).toBeNull();
  });
});

describe('429', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('GET waits a short Retry-After and retries once', async () => {
    await tokenStorage.save('tok', inDays(80));
    let n = 0;
    const calls = mockHttp(() => (n++ === 0 ? { status: 429, headers: { 'retry-after': '2' } } : { status: 200, data: { ok: 1 } }));
    const p = network.get('/customers');
    await jest.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toEqual({ ok: 1 });
    expect(calls).toHaveLength(2);
  });

  it('POST is never retried automatically; the wait is returned to the caller', async () => {
    const calls = mockHttp(() => ({
      status: 429,
      headers: { 'retry-after': '30' },
      data: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many codes.', details: { retry_after: 30 } } },
    }));
    await expect(network.post('/auth/email-code', { email: 'a@example.com', purpose: 'login' })).rejects.toMatchObject({
      kind: 'rateLimited',
      code: 'TOO_MANY_REQUESTS',
      retryAfterSeconds: 30,
    });
    expect(calls).toHaveLength(1);
  });
});
