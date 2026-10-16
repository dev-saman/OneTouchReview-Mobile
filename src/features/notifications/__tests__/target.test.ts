import { formatRelative } from '@/utils/format';

import { badgeLabel, notificationTarget, pushNotificationId, pushTarget, queryValue } from '../target';

describe('notificationTarget', () => {
  it('opens Clients with the Not sent filter for not_sent', () => {
    expect(notificationTarget({ kind: 'not_sent', subject: null })).toEqual({ type: 'clientsNotSent' });
  });

  it('web-only kinds show the web message', () => {
    for (const kind of ['google_connection', 'integration', 'sms_registration']) {
      expect(notificationTarget({ kind, subject: null })).toEqual({ type: 'webOnly' });
    }
  });

  it('texts_low shows the message only (never a billing link)', () => {
    expect(notificationTarget({ kind: 'texts_low', subject: null })).toEqual({ type: 'messageOnly' });
  });

  it('private_feedback opens the item, with source=card for card feedback', () => {
    expect(notificationTarget({ kind: 'private_feedback', subject: { type: 'review_response', id: 7 } })).toEqual({
      type: 'feedback',
      id: 7,
      source: 'request',
    });
    expect(notificationTarget({ kind: 'private_feedback', subject: { type: 'review_card_feedback', id: 8 } })).toEqual({
      type: 'feedback',
      id: 8,
      source: 'card',
    });
    expect(notificationTarget({ kind: 'private_feedback', subject: null })).toEqual({ type: 'feedbackList' });
  });

  it('google_review opens the review; ai_drafts opens Reviews filtered to AI drafts', () => {
    expect(notificationTarget({ kind: 'google_review', subject: { type: 'google_review', id: 2 } })).toEqual({ type: 'review', id: 2 });
    expect(notificationTarget({ kind: 'ai_drafts', subject: null })).toEqual({ type: 'reviewsAiDrafts' });
  });

  it('review_point_alert opens Reports at the point from the url', () => {
    expect(
      notificationTarget({ kind: 'review_point_alert', subject: { type: 'review_point_alert', id: 3 }, url: '/insights/points/42' }),
    ).toEqual({ type: 'reports', pointId: 42 });
    expect(notificationTarget({ kind: 'review_point_alert', subject: null, url: '/insights' })).toEqual({
      type: 'reports',
      pointId: null,
    });
  });

  it('unknown kinds are handled', () => {
    expect(notificationTarget({ kind: 'something_new', subject: null })).toEqual({ type: 'unknown' });
  });

  it('web-only and message-only kinds added October 14 (never a billing link)', () => {
    for (const kind of ['meta_reconnect', 'email_sender', 'follow_ups']) {
      expect(notificationTarget({ kind, subject: null })).toEqual({ type: 'webOnly' });
    }
    expect(notificationTarget({ kind: 'billing', subject: null, url: '/billing' })).toEqual({ type: 'messageOnly' });
    expect(notificationTarget({ kind: 'email_problem', subject: { type: 'user', id: 1 } })).toEqual({ type: 'profile' });
  });

  it('site_review opens the site review; site_reviews opens that site from the url', () => {
    expect(notificationTarget({ kind: 'site_review', subject: { type: 'site_review', id: 44 } })).toEqual({ type: 'siteReview', id: 44 });
    expect(notificationTarget({ kind: 'site_reviews', subject: null, url: '/reviews?source=yelp&profile_id=3' })).toEqual({
      type: 'siteReviews',
      platform: 'yelp',
      profileId: 3,
    });
  });

  it('card_form opens the chat from url /chats/{id}', () => {
    expect(notificationTarget({ kind: 'card_form', subject: null, url: '/chats/12' })).toEqual({ type: 'chat', id: 12 });
    expect(notificationTarget({ kind: 'card_form', subject: null, url: '/chats' })).toEqual({ type: 'chatsList' });
  });

  it('assistant opens by event', () => {
    const base = { kind: 'assistant' };
    expect(notificationTarget({ ...base, event: 'assistant.handoff', subject: { type: 'chat', id: 5 } })).toEqual({ type: 'chat', id: 5 });
    expect(notificationTarget({ ...base, event: 'assistant.booking_request', subject: { type: 'assistant_booking', id: 9 } })).toEqual({
      type: 'assistant',
      tab: 'bookings',
      bookingId: 9,
    });
    expect(notificationTarget({ ...base, event: 'assistant.training', subject: null, url: '/assistant/train' })).toEqual({
      type: 'assistant',
      tab: 'train',
      bookingId: null,
    });
    expect(notificationTarget({ ...base, event: 'assistant.limit_reached', subject: null })).toEqual({ type: 'webOnly' });
  });

  it('google_profile changes open approvals for the location in url; profile alerts are web only', () => {
    expect(
      notificationTarget({
        kind: 'google_profile',
        event: 'google_profile.approval_needed',
        subject: null,
        url: '/google-profile/changes?change=6&location_id=1497',
      }),
    ).toEqual({ type: 'googleProfile', locationId: 1497, changeId: 6 });
    expect(
      notificationTarget({ kind: 'google_profile', event: 'google_profile.change_live', subject: null, url: '/google-profile/changes?location_id=1498' }),
    ).toEqual({ type: 'googleProfile', locationId: 1498, changeId: null });
    expect(notificationTarget({ kind: 'google_profile', event: 'google_profile.weekly_summary', subject: null })).toEqual({ type: 'webOnly' });
  });

  it('review shield and review changes', () => {
    expect(notificationTarget({ kind: 'review_shield_flagged', subject: { type: 'review_flag', id: 9 } })).toEqual({ type: 'shieldFlag', id: 9 });
    expect(notificationTarget({ kind: 'review_shield_removed', subject: null })).toEqual({ type: 'reviewsList' });
    expect(notificationTarget({ kind: 'review_changed', subject: { type: 'google_review', id: 26 } })).toEqual({ type: 'review', id: 26 });
    expect(notificationTarget({ kind: 'review_changed', subject: null })).toEqual({ type: 'reviewsChanged' });
  });
});

describe('queryValue', () => {
  it('reads one value from a web path', () => {
    expect(queryValue('/reviews?source=yelp&profile_id=3', 'profile_id')).toBe('3');
    expect(queryValue('/reviews?source=yellow%20pages', 'source')).toBe('yellow pages');
    expect(queryValue('/reviews', 'source')).toBeNull();
    expect(queryValue(null, 'source')).toBeNull();
  });
});

describe('pushTarget', () => {
  it('opens the original three push types', () => {
    expect(pushTarget({ type: 'chat_message', chat_id: '12', deep_link: '/chats/12' })).toEqual({ type: 'chat', id: 12 });
    expect(pushTarget({ type: 'private_feedback', id: '88', deep_link: '/feedback/88' })).toEqual({
      type: 'feedback',
      id: 88,
      source: 'request',
    });
    expect(pushTarget({ type: 'google_review', id: '101', deep_link: '/reviews/101' })).toEqual({ type: 'review', id: 101 });
  });

  it('google_review_changed opens the review, a roll-up opens changed reviews', () => {
    expect(pushTarget({ type: 'google_review_changed', google_review_id: '26', kind: 'edited' })).toEqual({ type: 'review', id: 26 });
    expect(pushTarget({ type: 'google_review_changed', google_review_id: '', kind: 'rollup' })).toEqual({ type: 'reviewsChanged' });
  });

  it('opens the October 14 push types', () => {
    expect(pushTarget({ type: 'site_review', id: '44', deep_link: '/site-reviews/44' })).toEqual({ type: 'siteReview', id: 44 });
    expect(pushTarget({ type: 'site_reviews_imported', id: '3', deep_link: '/reviews?source=yelp&profile_id=3' })).toEqual({
      type: 'siteReviews',
      platform: 'yelp',
      profileId: 3,
    });
    expect(pushTarget({ type: 'google_reviews_imported', id: '1497' })).toEqual({ type: 'reviewsList' });
    expect(pushTarget({ type: 'review_shield_flagged', id: '9', deep_link: '/review-shield/9' })).toEqual({ type: 'shieldFlag', id: 9 });
    expect(pushTarget({ type: 'review_shield_flagged', count: '3', deep_link: '/review-shield' })).toEqual({ type: 'reviewsList' });
    expect(pushTarget({ type: 'assistant_handoff', url: '/chats/7', notification_id: '30' })).toEqual({ type: 'chat', id: 7 });
    expect(pushTarget({ type: 'assistant_booking', booking_id: '4' })).toEqual({ type: 'assistant', tab: 'bookings', bookingId: 4 });
    expect(pushTarget({ type: 'assistant_training', url: '/assistant/train' })).toEqual({ type: 'assistant', tab: 'train', bookingId: null });
    expect(pushTarget({ type: 'assistant_limit' })).toEqual({ type: 'webOnly' });
  });

  it('account pushes: Google profile changes open approvals, everything else is web only', () => {
    expect(
      pushTarget({ type: 'account', event: 'google_profile.approval_needed', url: '/google-profile/changes?change=6&location_id=1497' }),
    ).toEqual({ type: 'googleProfile', locationId: 1497, changeId: 6 });
    expect(pushTarget({ type: 'account', event: 'payment.failed', url: '/billing' })).toEqual({ type: 'webOnly' });
  });

  it('marks the bell item read from notification_id', () => {
    expect(pushNotificationId({ type: 'account', notification_id: '31' })).toBe(31);
    expect(pushNotificationId({ type: 'chat_message' })).toBeNull();
  });

  it('never opens anything else', () => {
    expect(pushTarget({ deep_link: '/settings/billing' })).toBeNull();
    expect(pushTarget({ deep_link: '/chats/12/delete' })).toBeNull();
    expect(pushTarget({ deep_link: 'https://evil.example.com/chats/1' })).toBeNull();
    expect(pushTarget({ deep_link: '/chats/abc' })).toBeNull();
    expect(pushTarget({})).toBeNull();
    expect(pushTarget({ type: 'chat_message', chat_id: '0' })).toEqual({ type: 'chatsList' });
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
