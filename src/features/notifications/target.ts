import type { AppNotification } from '@/api/types';

/**
 * Where a bell item or a push opens. Bell items: picked from kind, subject and event; url is a web
 * app path, read only where the Notifications tab says the id is in it. Pushes: from data.type
 * (Push tab). Sheet Notifications tab, "The app opens", and its October 14 rows.
 */
export type NotificationTarget =
  | { type: 'feedback'; id: number; source: 'request' | 'card' }
  | { type: 'feedbackList' }
  | { type: 'review'; id: number }
  | { type: 'reviewsAiDrafts' }
  /** A roll-up of changed Google reviews: Reviews with status=changed. */
  | { type: 'reviewsChanged' }
  | { type: 'reviewsList' }
  /** One review from another site (GET /site-reviews/{id}). */
  | { type: 'siteReview'; id: number }
  /** Reviews on one site's tab. */
  | { type: 'siteReviews'; platform: string | null; profileId: number | null }
  /** Review Shield flag, read-only (GET /review-shield/{id}). */
  | { type: 'shieldFlag'; id: number }
  /** Reports, highlighting the point from url /insights/points/{id} (build guide). */
  | { type: 'reports'; pointId: number | null }
  | { type: 'clientsNotSent' }
  | { type: 'chat'; id: number }
  | { type: 'chatsList' }
  /** Card assistant (screen 15) on a tab. */
  | { type: 'assistant'; tab: 'conversations' | 'bookings' | 'train'; bookingId: number | null }
  /** Google profile approvals (screen 17) for a location, with a change on top. */
  | { type: 'googleProfile'; locationId: number | null; changeId: number | null }
  /** email_problem: check the email address. */
  | { type: 'profile' }
  /** Fixed on the web: "Open OneTouchReview on the web to fix this" (never billing). */
  | { type: 'webOnly' }
  /** texts_low, billing: the message only — never a link to billing or plans. */
  | { type: 'messageOnly' }
  /** A kind this app version doesn't know. */
  | { type: 'unknown' };

/** Notifications tab "Web-only kinds now" (assistant limit and google_profile alerts are decided by event). */
const WEB_ONLY = new Set(['google_connection', 'integration', 'sms_registration', 'meta_reconnect', 'email_sender', 'follow_ups']);
const MESSAGE_ONLY = new Set(['texts_low', 'billing']);

/** google_profile events that open the approvals screen; other google_profile events are web only. */
const PROFILE_CHANGE_EVENTS = new Set([
  'approval_needed',
  'approval_reminder',
  'change_live',
  'change_rejected',
  'change_stuck',
  'approval_lapsed',
  'queue_paused',
  'sending_started',
]);

const toId = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** The number in a path such as /chats/{id}, or null. */
function idInPath(url: unknown, prefix: string): number | null {
  if (typeof url !== 'string') return null;
  const match = url.trim().match(new RegExp(`^${prefix}/(\\d+)(?:[?#]|$)`));
  return match ? toId(match[1]) : null;
}

/** One query value from a web path such as /reviews?source=yelp&profile_id=3. */
export function queryValue(url: unknown, key: string): string | null {
  if (typeof url !== 'string') return null;
  const query = url.split('#')[0].split('?')[1];
  if (!query) return null;
  for (const part of query.split('&')) {
    const [k, v = ''] = part.split('=');
    if (k === key) {
      try {
        return decodeURIComponent(v.replace(/\+/g, ' ')) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** The build guide: "the point id is the number in url /insights/points/{id}". */
export function pointIdFromUrl(url: string | null | undefined): number | null {
  const match = url?.match(/\/insights\/points\/(\d+)/);
  return match ? Number(match[1]) : null;
}

const profileEvent = (event: unknown) =>
  typeof event === 'string' && event.startsWith('google_profile.') ? event.slice('google_profile.'.length) : null;

const googleProfileFromUrl = (url: unknown): NotificationTarget => ({
  type: 'googleProfile',
  locationId: toId(queryValue(url, 'location_id')),
  changeId: toId(queryValue(url, 'change')),
});

const siteReviewsFromUrl = (url: unknown): NotificationTarget => ({
  type: 'siteReviews',
  platform: queryValue(url, 'source'),
  profileId: toId(queryValue(url, 'profile_id')),
});

export function notificationTarget(
  n: Pick<AppNotification, 'kind' | 'subject'> & { url?: string | null; event?: string | null },
): NotificationTarget {
  const subjectId = toId(n.subject?.id);
  const subjectType = n.subject?.type;
  switch (n.kind) {
    case 'private_feedback':
      // add source=card when subject.type is review_card_feedback
      return subjectId !== null
        ? { type: 'feedback', id: subjectId, source: subjectType === 'review_card_feedback' ? 'card' : 'request' }
        : { type: 'feedbackList' };
    case 'google_review':
      return subjectId !== null ? { type: 'review', id: subjectId } : { type: 'reviewsList' };
    case 'ai_drafts':
      return { type: 'reviewsAiDrafts' };
    case 'not_sent':
      return { type: 'clientsNotSent' };
    case 'review_point_alert':
      return { type: 'reports', pointId: pointIdFromUrl(n.url) };
    case 'email_problem':
      return { type: 'profile' };
    case 'review_changed':
      // One review, or a roll-up (more than 3) → Reviews with status=changed.
      return subjectType === 'google_review' && subjectId !== null ? { type: 'review', id: subjectId } : { type: 'reviewsChanged' };
    case 'site_review':
      return subjectId !== null ? { type: 'siteReview', id: subjectId } : siteReviewsFromUrl(n.url);
    case 'site_reviews':
      // A site's (or Google's) first import is complete.
      return siteReviewsFromUrl(n.url);
    case 'card_form': {
      const chatId = idInPath(n.url, '/chats');
      return chatId !== null ? { type: 'chat', id: chatId } : { type: 'chatsList' };
    }
    case 'review_shield_flagged':
    case 'review_shield_removed':
      return subjectId !== null ? { type: 'shieldFlag', id: subjectId } : { type: 'reviewsList' };
    case 'assistant':
      switch (n.event) {
        case 'assistant.handoff': {
          const chatId = subjectId ?? idInPath(n.url, '/chats');
          return chatId !== null ? { type: 'chat', id: chatId } : { type: 'chatsList' };
        }
        case 'assistant.booking_request':
          return { type: 'assistant', tab: 'bookings', bookingId: subjectId };
        case 'assistant.training':
          return { type: 'assistant', tab: 'train', bookingId: null };
        case 'assistant.limit_reached':
          return { type: 'webOnly' };
        default:
          return { type: 'assistant', tab: 'conversations', bookingId: null };
      }
    case 'google_profile': {
      const event = profileEvent(n.event);
      return event && PROFILE_CHANGE_EVENTS.has(event) ? googleProfileFromUrl(n.url) : { type: 'webOnly' };
    }
    default:
      if (WEB_ONLY.has(n.kind)) return { type: 'webOnly' };
      if (MESSAGE_ONLY.has(n.kind)) return { type: 'messageOnly' };
      return { type: 'unknown' };
  }
}

/**
 * A tapped push (Push tab): data values are strings. Unknown types fall back to the documented
 * deep_link shapes; anything else opens nothing (never an arbitrary path from a push).
 */
export function pushTarget(data: Record<string, unknown>): NotificationTarget | null {
  const link = typeof data.deep_link === 'string' ? data.deep_link.trim() : '';
  const id = toId(data.id);
  switch (data.type) {
    case 'chat_message': {
      const chatId = toId(data.chat_id) ?? idInPath(link, '/chats');
      return chatId !== null ? { type: 'chat', id: chatId } : { type: 'chatsList' };
    }
    case 'private_feedback':
      // Push feedback comes from review requests (source=request, the default).
      return id !== null ? { type: 'feedback', id, source: 'request' } : { type: 'feedbackList' };
    case 'google_review':
      return id !== null ? { type: 'review', id } : { type: 'reviewsList' };
    case 'google_review_changed': {
      const reviewId = toId(data.google_review_id);
      return reviewId !== null ? { type: 'review', id: reviewId } : { type: 'reviewsChanged' };
    }
    case 'site_review':
      return id !== null ? { type: 'siteReview', id } : { type: 'reviewsList' };
    case 'site_reviews_imported':
      return siteReviewsFromUrl(link);
    case 'google_reviews_imported':
      return { type: 'reviewsList' };
    case 'review_shield_flagged':
    case 'review_shield_removed': {
      const flagId = idInPath(link, '/review-shield');
      return flagId !== null ? { type: 'shieldFlag', id: flagId } : { type: 'reviewsList' };
    }
    case 'assistant_handoff': {
      const chatId = idInPath(data.url, '/chats');
      return chatId !== null ? { type: 'chat', id: chatId } : { type: 'chatsList' };
    }
    case 'assistant_booking':
      return { type: 'assistant', tab: 'bookings', bookingId: toId(data.booking_id) };
    case 'assistant_training':
      return { type: 'assistant', tab: 'train', bookingId: null };
    case 'assistant_limit':
      return { type: 'webOnly' };
    case 'account': {
      const event = profileEvent(data.event);
      if (event && PROFILE_CHANGE_EVENTS.has(event)) return googleProfileFromUrl(data.url);
      // Billing, texting, connections …: the text with "Open OneTouchReview on the web" (never /billing).
      return { type: 'webOnly' };
    }
    default: {
      const match = link.match(/^\/(chats|feedback|reviews)\/(\d+)$/);
      if (!match) return null;
      const linkId = Number(match[2]);
      if (match[1] === 'chats') return { type: 'chat', id: linkId };
      if (match[1] === 'feedback') return { type: 'feedback', id: linkId, source: 'request' };
      return { type: 'review', id: linkId };
    }
  }
}

/** The bell item a push stands for (account and assistant pushes): marked read when tapped. */
export const pushNotificationId = (data: Record<string, unknown>): number | null => toId(data.notification_id);

/** "9+" above 9 (bell and badge text). */
export function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}
