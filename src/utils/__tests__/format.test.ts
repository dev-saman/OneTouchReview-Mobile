import { formatDate, formatPhone, formatRating, greeting, humanize, initials, isFuture } from '../format';

describe('formatDate', () => {
  it('formats API timestamps', () => {
    expect(formatDate('2027-01-12T15:00:00.000000Z')).toBe('Jan 12, 2027');
    expect(formatDate('2026-09-08')).toMatch(/^Sep [78], 2026$/); // date-only is UTC midnight
  });

  it('returns an empty string for missing or bad dates', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
});

describe('formatPhone', () => {
  it('formats US numbers', () => {
    expect(formatPhone('+15125550123')).toBe('(512) 555-0123');
    expect(formatPhone('5125550123')).toBe('(512) 555-0123');
  });

  it('leaves other numbers as given', () => {
    expect(formatPhone('+442071234567')).toBe('+442071234567');
    expect(formatPhone(null)).toBe('');
  });
});

describe('formatRating', () => {
  it('shows whole numbers plainly and others with one decimal', () => {
    expect(formatRating(4)).toBe('4');
    expect(formatRating(4.25)).toBe('4.3');
    expect(formatRating(null)).toBe('—');
  });
});

describe('humanize', () => {
  it('turns API words into labels', () => {
    expect(humanize('opted_in')).toBe('Opted in');
    expect(humanize('queued')).toBe('Queued');
    expect(humanize(null)).toBe('');
  });
});

describe('isFuture', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  it('is true only for later dates', () => {
    expect(isFuture('2027-01-02T15:00:00.000000Z', now)).toBe(true);
    expect(isFuture('2026-10-01T15:00:00.000000Z', now)).toBe(false);
    expect(isFuture(null, now)).toBe(false);
  });
});

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Test Email')).toBe('TE');
    expect(initials('Mary Ann Smith')).toBe('MS');
  });

  it('takes two letters of a single word', () => {
    expect(initials('sample')).toBe('SA');
  });

  it('falls back to "?" when there is no name', () => {
    expect(initials(null)).toBe('?');
    expect(initials('  ')).toBe('?');
    expect(initials('— ·')).toBe('?');
  });
});

describe('greeting', () => {
  it('follows the hour of the day', () => {
    expect(greeting(6)).toBe('Good morning');
    expect(greeting(12)).toBe('Good afternoon');
    expect(greeting(18)).toBe('Good evening');
  });
});
