import { errorFromResponse, makeError } from '@/api/errors';

import { describeRefusal } from '../refusal';

const refused = (status: number, code: string, details?: Record<string, unknown>) =>
  errorFromResponse(status, { error: { code, message: 'Server says no.', details } });

describe('describeRefusal', () => {
  it('RECENTLY_REQUESTED shows when the client can be asked again', () => {
    const r = describeRefusal(refused(422, 'RECENTLY_REQUESTED', { next_allowed_at: '2027-01-12T15:00:00.000000Z' }));
    expect(r.title).toBe('Asked recently');
    expect(r.details).toEqual(['Can be asked again on Jan 12, 2027.']);
  });

  it('NO_CHANNEL lists the per-channel reasons', () => {
    const r = describeRefusal(refused(422, 'NO_CHANNEL', { sms: 'Client replied STOP.', email: ['Email bounced.'] }));
    expect(r.details).toEqual(['Text: Client replied STOP.', 'Email: Email bounced.']);
  });

  it('NO_CONSENT lets the user confirm consent', () => {
    expect(describeRefusal(refused(422, 'NO_CONSENT')).canConfirmConsent).toBe(true);
    expect(describeRefusal(refused(422, 'NO_PHONE')).canConfirmConsent).toBe(false);
  });

  it('adds the prescribed hints', () => {
    expect(describeRefusal(refused(422, 'CUSTOMER_OPTED_OUT')).details).toContain(
      'Only the client can undo this.',
    );
    expect(describeRefusal(refused(422, 'NO_REVIEW_LINK')).details).toEqual(['Set it up on the web.']);
  });

  it('falls back to a generic title for unknown codes and network failures', () => {
    expect(describeRefusal(refused(422, 'SOMETHING_NEW')).title).toBe('Couldn’t send');
    expect(describeRefusal(makeError('offline')).title).toBe('Not sent');
  });

  it('ignores details with unexpected shapes', () => {
    const r = describeRefusal(refused(422, 'NO_CHANNEL', { sms: { reason: 'x' }, email: 42 }));
    expect(r.details).toEqual([]);
  });
});
