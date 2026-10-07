import type { AppNotification } from '@/api/types';

/**
 * Where a bell item opens. Picked from kind and subject, never from url (a web app path).
 * Sheet Notifications tab, "The app opens".
 */
export type NotificationTarget =
  | { type: 'clientsNotSent' }
  /** Google connection, integration, texting registration: fixed on the web. */
  | { type: 'webOnly' }
  /** texts_low: the message only — never a link to billing or plans. */
  | { type: 'messageOnly' }
  /** The screen exists in the build guide but not in the app yet. */
  | { type: 'notInAppYet'; feature: string }
  /** A kind this app version doesn't know. */
  | { type: 'unknown' };

const WEB_ONLY = new Set(['google_connection', 'integration', 'sms_registration']);

export function notificationTarget(n: Pick<AppNotification, 'kind'>): NotificationTarget {
  switch (n.kind) {
    case 'not_sent':
      return { type: 'clientsNotSent' };
    case 'texts_low':
      return { type: 'messageOnly' };
    case 'private_feedback':
      return { type: 'notInAppYet', feature: 'Private feedback' };
    case 'google_review':
    case 'ai_drafts':
      return { type: 'notInAppYet', feature: 'Reviews' };
    case 'review_point_alert':
      return { type: 'notInAppYet', feature: 'Reports' };
    default:
      return WEB_ONLY.has(n.kind) ? { type: 'webOnly' } : { type: 'unknown' };
  }
}

/** "9+" above 9 (bell and badge text). */
export function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}
