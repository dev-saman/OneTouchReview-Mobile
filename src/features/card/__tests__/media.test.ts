import { fileSize, isVideoLink, move } from '../media';

describe('move', () => {
  it('swaps an item with its neighbour', () => {
    expect(move([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(move([1, 2, 3], 2, -1)).toEqual([1, 3, 2]);
  });
  it('ignores moves past either end', () => {
    expect(move([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(move([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});

describe('isVideoLink', () => {
  it('accepts YouTube and Vimeo links only', () => {
    expect(isVideoLink('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isVideoLink('https://youtu.be/abc')).toBe(true);
    expect(isVideoLink('https://vimeo.com/123')).toBe(true);
    expect(isVideoLink('https://example.com/video.mp4')).toBe(false);
    expect(isVideoLink('youtube.com/watch?v=abc')).toBe(false);
  });
});

describe('fileSize', () => {
  it('shows KB or MB', () => {
    expect(fileSize(182044)).toBe('178 KB');
    expect(fileSize(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(fileSize(10)).toBe('1 KB');
  });
});
