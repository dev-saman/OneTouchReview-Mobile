import { hrefForDeepLink } from '../deepLink';

describe('hrefForDeepLink', () => {
  it('opens the three documented push targets', () => {
    expect(hrefForDeepLink('/chats/12')).toEqual({ pathname: '/chats/[id]', params: { id: '12' } });
    expect(hrefForDeepLink('/feedback/88')).toEqual({ pathname: '/feedback/[id]', params: { id: '88', source: 'request' } });
    expect(hrefForDeepLink('/reviews/101')).toEqual({ pathname: '/reviews/[id]', params: { id: '101' } });
  });

  it('ignores anything else', () => {
    expect(hrefForDeepLink('/settings/billing')).toBeNull();
    expect(hrefForDeepLink('/chats/12/delete')).toBeNull();
    expect(hrefForDeepLink('https://evil.example.com/chats/1')).toBeNull();
    expect(hrefForDeepLink('/chats/abc')).toBeNull();
    expect(hrefForDeepLink(undefined)).toBeNull();
    expect(hrefForDeepLink(42)).toBeNull();
  });
});
