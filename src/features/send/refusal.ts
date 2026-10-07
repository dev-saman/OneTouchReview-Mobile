import type { ApiError } from '@/api/types';
import { formatDate } from '@/utils/format';

export type Refusal = {
  /** Short heading. The API's own message is always shown under it. */
  title: string;
  /** Extra lines from error.details (dates, per-channel reasons). */
  details: string[];
  /** NO_CONSENT: the user can confirm consent by adding the client again with the tick. */
  canConfirmConsent: boolean;
};

const TITLES: Record<string, string> = {
  RECENTLY_REQUESTED: 'Asked recently',
  CUSTOMER_OPTED_OUT: 'This client opted out',
  NO_CONSENT: 'No consent on record',
  NO_CHANNEL: 'Can’t text or email this client now',
  NO_REVIEW_LINK: 'This location has no review link',
  LOCATION_PAUSED: 'This location is paused',
  NO_PHONE: 'No phone number',
  QUOTA_EXHAUSTED: 'Monthly message limit used',
  SUBSCRIPTION_REQUIRED: 'Not available in the app',
  FORBIDDEN: 'Not allowed',
};

/** Extra guidance the Errors tab prescribes ("What the app shows"). */
const HINTS: Record<string, string> = {
  CUSTOMER_OPTED_OUT: 'Only the client can undo this.',
  NO_REVIEW_LINK: 'Set it up on the web.',
  NO_PHONE: 'Send by email instead, or add a phone number.',
};

function reasonText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === 'string' && !!v.trim());
    return parts.length ? parts.join(' ') : null;
  }
  return null;
}

/**
 * Turns a refused send into plain words. Branches on error.code only (never on message text);
 * the server's message is shown as-is by the screen.
 */
export function describeRefusal(error: ApiError): Refusal {
  const code = error.code ?? '';
  const details: string[] = [];

  if (code === 'RECENTLY_REQUESTED') {
    const date = formatDate(typeof error.details?.next_allowed_at === 'string' ? error.details.next_allowed_at : null);
    if (date) details.push(`Can be asked again on ${date}.`);
  }
  if (code === 'NO_CHANNEL') {
    const sms = reasonText(error.details?.sms);
    const email = reasonText(error.details?.email);
    if (sms) details.push(`Text: ${sms}`);
    if (email) details.push(`Email: ${email}`);
  }
  if (HINTS[code]) details.push(HINTS[code]);

  return {
    title: TITLES[code] ?? (error.kind === 'offline' || error.kind === 'network' || error.kind === 'timeout' ? 'Not sent' : 'Couldn’t send'),
    details,
    canConfirmConsent: code === 'NO_CONSENT',
  };
}
