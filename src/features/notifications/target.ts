import type { AppNotification } from '@/api/types';

/**
 * Where a bell item opens. Picked from kind and subject, never from url (a web app path).
 * Sheet Notifications tab, "The app opens".
 */
export type NotificationTarget =
  | { type: 'feedback'; id: number; source: 'request' | 'card' }
  | { type: 'feedbackList' }
  | { type: 'review'; id: number }
  | { type: 'reviewsAiDrafts' }
  | { type: 'reviewsList' }
  /** Reports, highlighting the point from url /insights/points/{id} (build guide). */
  | { type: 'reports'; pointId: number | null }
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

/** The build guide: "the point id is the number in url /insights/points/{id}". */
export function pointIdFromUrl(url: string | null | undefined): number | null {
  const match = url?.match(/\/insights\/points\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function notificationTarget(n: Pick<AppNotification, 'kind' | 'subject'> & { url?: string | null }): NotificationTarget {
  const subjectId = typeof n.subject?.id === 'number' ? n.subject.id : null;
  switch (n.kind) {
    case 'private_feedback':
      // add source=card when subject.type is review_card_feedback
      return subjectId !== null
        ? { type: 'feedback', id: subjectId, source: n.subject?.type === 'review_card_feedback' ? 'card' : 'request' }
        : { type: 'feedbackList' };
    case 'google_review':
      return subjectId !== null ? { type: 'review', id: subjectId } : { type: 'reviewsList' };
    case 'ai_drafts':
      return { type: 'reviewsAiDrafts' };
    case 'not_sent':
      return { type: 'clientsNotSent' };
    case 'texts_low':
      return { type: 'messageOnly' };
    case 'review_point_alert':
      return { type: 'reports', pointId: pointIdFromUrl(n.url) };
    default:
      return WEB_ONLY.has(n.kind) ? { type: 'webOnly' } : { type: 'unknown' };
  }
}

/** "9+" above 9 (bell and badge text). */
export function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}
