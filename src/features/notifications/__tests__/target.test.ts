import { formatRelative } from '@/utils/format';

import { badgeLabel, notificationTarget } from '../target';

describe('notificationTarget', () => {
  it('opens Clients with the Not sent filter for not_sent', () => {
    expect(notificationTarget({ kind: 'not_sent' })).toEqual({ type: 'clientsNotSent' });
  });

  it('web-only kinds show the web message', () => {
    for (const kind of ['google_connection', 'integration', 'sms_registration']) {
      expect(notificationTarget({ kind })).toEqual({ type: 'webOnly' });
    }
  });

  it('texts_low shows the message only (never a billing link)', () => {
    expect(notificationTarget({ kind: 'texts_low' })).toEqual({ type: 'messageOnly' });
  });

  it('screens not built yet say so', () => {
    expect(notificationTarget({ kind: 'private_feedback' })).toEqual({ type: 'notInAppYet', feature: 'Private feedback' });
    expect(notificationTarget({ kind: 'google_review' })).toEqual({ type: 'notInAppYet', feature: 'Reviews' });
    expect(notificationTarget({ kind: 'ai_drafts' })).toEqual({ type: 'notInAppYet', feature: 'Reviews' });
    expect(notificationTarget({ kind: 'review_point_alert' })).toEqual({ type: 'notInAppYet', feature: 'Reports' });
  });

  it('unknown kinds are handled', () => {
    expect(notificationTarget({ kind: 'something_new' })).toEqual({ type: 'unknown' });
  });
});

describe('badgeLabel', () => {
  it('shows 9+ above 9', () => {
    expect(badgeLabel(3)).toBe('3');
    expect(badgeLabel(9)).toBe('9');
    expect(badgeLabel(10)).toBe('9+');
  });
});

describe('formatRelative', () => {
  const now = Date.parse('2026-10-07T15:00:00Z');
  it('describes recent times', () => {
    expect(formatRelative('2026-10-07T14:59:40Z', now)).toBe('just now');
    expect(formatRelative('2026-10-07T14:55:00Z', now)).toBe('5 min ago');
    expect(formatRelative('2026-10-07T12:00:00Z', now)).toBe('3 h ago');
    expect(formatRelative('2026-10-06T12:00:00Z', now)).toBe('yesterday');
    expect(formatRelative('2026-10-03T12:00:00Z', now)).toBe('4 days ago');
    expect(formatRelative('2026-09-20T12:00:00Z', now)).toBe('Sep 20, 2026');
    expect(formatRelative(null, now)).toBe('');
  });
});
