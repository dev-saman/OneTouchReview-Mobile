import type { DigitalCard } from '@/api/types';

import { defaultShareCard, shareLink, shareMessage, shareableCards } from '../shareCard';

const card = (id: number, kind: string, extra: Partial<DigitalCard> = {}) =>
  ({ id, kind, location_id: null, name: `Card ${id}`, url: null, short_url: `https://card.vu/c/${id}`, ...extra }) as DigitalCard;

const business = card(1, 'business');
const austin = card(2, 'location', { location_id: 1497 });
const member = card(3, 'member');

describe('defaultShareCard', () => {
  it('picks the chosen location card, then the business card, then the first', () => {
    expect(defaultShareCard([member, business, austin], 1497)).toBe(austin);
    expect(defaultShareCard([member, business, austin], 1498)).toBe(business);
    expect(defaultShareCard([member, business, austin], 'all')).toBe(business);
    expect(defaultShareCard([member], 'all')).toBe(member);
    expect(defaultShareCard([], 1497)).toBeNull();
  });
});

describe('sharing', () => {
  it('shares url, or short_url when url is null, as "{name}: {link}"', () => {
    expect(shareLink(business)).toBe('https://card.vu/c/1');
    expect(shareMessage({ ...business, url: 'https://card.vu/smith-law' })).toBe('Card 1: https://card.vu/smith-law');
  });

  it('only cards with a short link can be shared', () => {
    expect(shareableCards([business, card(4, 'member', { short_url: null })])).toEqual([business]);
  });
});
