import { compareVersions, isBelowMinimum } from '../version';

describe('compareVersions', () => {
  it.each([
    ['1.0.0', '1.0.0', 0],
    ['1.0.1', '1.0.0', 1],
    ['1.2.9', '1.2.10', -1],
    ['2.0', '1.9.9', 1],
    ['1.0', '1.0.0', 0],
    ['1.0.0-beta', '1.0.0', 0],
  ])('%s vs %s → %i', (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
  });
});

describe('isBelowMinimum (force update)', () => {
  it('blocks only when installed < minimum', () => {
    expect(isBelowMinimum('1.0.0', '1.0.1')).toBe(true);
    expect(isBelowMinimum('1.0.0', '1.0.0')).toBe(false);
    expect(isBelowMinimum('1.1.0', '1.0.9')).toBe(false);
  });

  it('no minimum → never blocks', () => {
    expect(isBelowMinimum('1.0.0', null)).toBe(false);
    expect(isBelowMinimum('1.0.0', undefined)).toBe(false);
  });
});
