import type { AssistantBooking } from '@/api/types';

/** The wall-clock parts of an instant in a time zone. */
function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, min: get('minute') };
}

/** Minutes the zone is ahead of UTC at that instant (e.g. -300 for Chicago in summer). */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Math.floor(date.getTime() / 60000) * 60000) / 60000;
}

/**
 * "2026-10-20" + "10:00" in the booking's time zone → ISO in UTC, for POST …/suggest starts_at
 * ("requested_at is UTC; show it in the booking's timezone"). Falls back to the phone's zone.
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string | null | undefined): string {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, h, min);
  if (!timeZone) return new Date(y, m - 1, d, h, min).toISOString();
  try {
    // Two passes settle the offset across a daylight-saving change.
    let guess = asUtc - offsetMinutes(new Date(asUtc), timeZone) * 60000;
    guess = asUtc - offsetMinutes(new Date(guess), timeZone) * 60000;
    return new Date(guess).toISOString();
  } catch {
    return new Date(y, m - 1, d, h, min).toISOString();
  }
}

/** "Tue, Oct 20, 10:00 AM (CDT)" in the booking's time zone. */
export function formatInZone(iso: string | null | undefined, timeZone: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  try {
    return date.toLocaleString('en-US', timeZone ? { ...options, timeZone } : options);
  } catch {
    return date.toLocaleString('en-US', options);
  }
}

/** "YYYY-MM-DD" for today and the next days, in the booking's zone (date chips). */
export function nextDays(count: number, timeZone: string | null | undefined, now = new Date()): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const day = new Date(now.getTime() + i * 86400000);
    let p: { y: number; m: number; d: number };
    try {
      p = timeZone ? partsIn(day, timeZone) : { y: day.getFullYear(), m: day.getMonth() + 1, d: day.getDate() };
    } catch {
      p = { y: day.getFullYear(), m: day.getMonth() + 1, d: day.getDate() };
    }
    days.push(`${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`);
  }
  return [...new Set(days)];
}

/** "2026-10-20" → "Tue, Oct 20" (a calendar date, no time zone shift). */
export function dayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Half-hour times from 08:00 to 18:00 (time chips). */
export const DAY_TIMES = Array.from({ length: 21 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});

/** "14:30" → "2:30 PM". */
export function timeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Bookings: new first, then by requested time. */
export function sortBookings(bookings: AssistantBooking[]): AssistantBooking[] {
  return [...bookings].sort(
    (a, b) => Number(b.status === 'new') - Number(a.status === 'new') || Date.parse(a.requested_at) - Date.parse(b.requested_at),
  );
}
