import type { AssistantBooking } from '@/api/types';

import { DAY_TIMES, dayLabel, nextDays, sortBookings, timeLabel, zonedTimeToUtc } from '../time';

describe('zonedTimeToUtc', () => {
  it('turns a time in the booking’s zone into UTC', () => {
    expect(zonedTimeToUtc('2026-10-20', '10:00', 'America/Chicago')).toBe('2026-10-20T15:00:00.000Z');
    // After the clocks go back (CST, UTC-6).
    expect(zonedTimeToUtc('2026-12-01', '10:00', 'America/Chicago')).toBe('2026-12-01T16:00:00.000Z');
    expect(zonedTimeToUtc('2026-10-20', '09:30', 'UTC')).toBe('2026-10-20T09:30:00.000Z');
  });
});

describe('nextDays', () => {
  it('lists dates in the zone, starting today', () => {
    expect(nextDays(3, 'America/Chicago', new Date('2026-10-16T03:00:00Z'))).toEqual(['2026-10-15', '2026-10-16', '2026-10-17']);
  });
});

describe('times', () => {
  it('offers half hours from 8 AM to 6 PM', () => {
    expect(DAY_TIMES[0]).toBe('08:00');
    expect(DAY_TIMES[DAY_TIMES.length - 1]).toBe('18:00');
    expect(timeLabel('14:30')).toBe('2:30 PM');
    expect(timeLabel('08:00')).toBe('8:00 AM');
    expect(timeLabel('12:00')).toBe('12:00 PM');
    expect(dayLabel('2026-10-20')).toBe('Tue, Oct 20');
  });
});

describe('sortBookings', () => {
  it('puts new requests first, then by time', () => {
    const b = (id: number, status: string, at: string) => ({ id, status, requested_at: at }) as AssistantBooking;
    expect(
      sortBookings([b(1, 'confirmed', '2026-10-01T00:00:00Z'), b(2, 'new', '2026-10-20T00:00:00Z'), b(3, 'new', '2026-10-18T00:00:00Z')]).map(
        (x) => x.id,
      ),
    ).toEqual([3, 2, 1]);
  });
});
