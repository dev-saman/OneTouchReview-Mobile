import { errorFromResponse, fieldError, isTransient, makeError, parseRetryAfter } from '../errors';

describe('errorFromResponse', () => {
  it('reads { error: { code, message, details } } and keeps the server message', () => {
    const e = errorFromResponse(422, {
      error: { code: 'RECENTLY_REQUESTED', message: 'Can be asked again on Oct 9.', details: { next_allowed_at: 'x' } },
    });
    expect(e).toMatchObject({
      kind: 'rejected',
      status: 422,
      code: 'RECENTLY_REQUESTED',
      message: 'Can be asked again on Oct 9.',
      serverMessage: true,
      details: { next_allowed_at: 'x' },
    });
  });

  it('maps VALIDATION_FAILED details to field errors', () => {
    const e = errorFromResponse(422, {
      error: { code: 'VALIDATION_FAILED', message: 'Check the fields.', details: { current_password: ['Wrong password.'], email: 'Taken.' } },
    });
    expect(e.kind).toBe('validation');
    expect(e.fieldErrors).toEqual({ current_password: ['Wrong password.'], email: ['Taken.'] });
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'rejected'],
    [402, 'rejected'],
    [429, 'rateLimited'],
    [500, 'server'],
    [503, 'server'],
  ])('status %i → %s', (status, kind) => {
    expect(errorFromResponse(status, {}).kind).toBe(kind);
  });

  it('uses the prescribed web message for SUBSCRIPTION_REQUIRED (no billing link)', () => {
    const e = errorFromResponse(402, { error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Upgrade at https://billing' } });
    expect(e.message).toBe('Open OneTouchReview on the web to continue.');
    expect(e.message).not.toMatch(/http|billing|price|plan/i);
  });

  it('429: prefers the Retry-After header, falls back to details.retry_after', () => {
    expect(errorFromResponse(429, {}, '12').retryAfterSeconds).toBe(12);
    expect(
      errorFromResponse(429, { error: { code: 'TOO_MANY_REQUESTS', message: 'Wait', details: { retry_after: 40 } } })
        .retryAfterSeconds,
    ).toBe(40);
  });

  it('falls back to a local message when the body is not JSON', () => {
    const e = errorFromResponse(500, '<html>');
    expect(e.serverMessage).toBe(false);
    expect(e.message).toMatch(/trouble/);
  });
});

describe('parseRetryAfter', () => {
  it('handles seconds and HTTP dates', () => {
    expect(parseRetryAfter('5')).toBe(5);
    expect(parseRetryAfter(3.2)).toBe(4);
    const now = Date.parse('2026-10-06T10:00:00Z');
    expect(parseRetryAfter('Tue, 06 Oct 2026 10:00:30 GMT', now)).toBe(30);
    expect(parseRetryAfter('nonsense')).toBeUndefined();
  });
});

describe('isTransient', () => {
  it('offline, network, timeout and 5xx keep the session', () => {
    expect(isTransient(makeError('offline'))).toBe(true);
    expect(isTransient(makeError('network'))).toBe(true);
    expect(isTransient(makeError('timeout'))).toBe(true);
    expect(isTransient(makeError('server', { status: 500 }))).toBe(true);
  });

  it('auth, validation and GOOGLE_SIGNIN_OFF are not transient', () => {
    expect(isTransient(makeError('unauthorized'))).toBe(false);
    expect(isTransient(makeError('validation'))).toBe(false);
    expect(isTransient(makeError('server', { status: 503, code: 'GOOGLE_SIGNIN_OFF' }))).toBe(false);
  });
});

describe('fieldError', () => {
  it('reads VALIDATION_FAILED details for the field', () => {
    const e = errorFromResponse(422, {
      error: { code: 'VALIDATION_FAILED', message: 'Check the fields.', details: { current_password: ['Wrong password.'] } },
    });
    expect(fieldError(e, 'current_password')).toBe('Wrong password.');
    expect(fieldError(e, 'password')).toBeUndefined();
  });

  it('shows SAME_EMAIL and EMAIL_TAKEN under the email field', () => {
    const same = errorFromResponse(422, { error: { code: 'SAME_EMAIL', message: 'That is already your email.' } });
    const taken = errorFromResponse(422, { error: { code: 'EMAIL_TAKEN', message: 'Another account uses it.' } });
    expect(fieldError(same, 'email')).toBe('That is already your email.');
    expect(fieldError(taken, 'email')).toBe('Another account uses it.');
    expect(fieldError(taken, 'password')).toBeUndefined();
    expect(fieldError(null, 'email')).toBeUndefined();
  });
});
