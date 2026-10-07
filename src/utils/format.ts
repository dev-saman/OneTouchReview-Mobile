/** Display helpers. Never used for logging: client data stays on screen only. */

/** "Oct 7, 2026". Empty string for a missing or unreadable date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Oct 14, 2026, 10:00 AM" in the phone's time zone. Empty string for a missing or bad date. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const minutes = Math.floor(Math.max(0, now - time) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

/** US numbers as "(512) 555-0123"; anything else is shown as given. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return phone;
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

/** "4.3" for an average, "—" when there is none. */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined || !Number.isFinite(rating)) return '—';
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

/** Turns API words like "opted_in" or "queued" into "Opted in" / "Queued". */
export function humanize(value: string | null | undefined): string {
  if (!value) return '';
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** True when the date is still in the future (e.g. next_request_allowed_at). */
export function isFuture(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return !Number.isNaN(time) && time > now;
}
