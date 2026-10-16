import { changeLabel } from '../changes';

describe('changeLabel', () => {
  it('describes each change kind in plain words', () => {
    expect(changeLabel('edited', 4, 2)).toBe('Edited: 4★ → 2★');
    expect(changeLabel('edited', 4, 4)).toBe('Edited');
    expect(changeLabel('edited', null, null)).toBe('Edited');
    expect(changeLabel('removed', 1, null)).toBe('Removed from Google');
    expect(changeLabel('restored', 1, 1)).toBe('Back on Google');
    expect(changeLabel('something_new', null, null)).toBe('Changed');
  });
});
