import type { DigitalCard } from '@/api/types';
import { targetWidth } from '@/services/photos/cardPhoto';

import { cardChanges, formFromCard, normalizeSlug, slugChange } from '../cardForm';

jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('expo-image-picker', () => ({}));

const CARD: DigitalCard = {
  id: 1,
  kind: 'business',
  location_id: null,
  slug: null,
  enabled: false,
  live: false,
  name: 'Smith Law',
  title: null,
  photo_url: null,
  url: null,
  short_url: 'https://card.vu/c/abc',
  staff_member_id: null,
  stats_30d: null,
  can_edit: true,
  bio: null,
  phone: null,
  email: null,
  website: null,
  booking_url: null,
  address: { line1: '100 Congress Ave', line2: null, city: 'Austin', state: 'TX', zip: '78701' },
  has_photo: false,
};

describe('cardChanges', () => {
  it('sends nothing when nothing changed', () => {
    expect(cardChanges(CARD, formFromCard(CARD))).toEqual({});
  });

  it('sends only changed fields, trimmed', () => {
    const form = { ...formFromCard(CARD), title: '  Family law attorney ', bio: 'Helping Austin families since 2010.' };
    expect(cardChanges(CARD, form)).toEqual({ title: 'Family law attorney', bio: 'Helping Austin families since 2010.' });
  });

  it('sends a cleared field as null', () => {
    const card = { ...CARD, website: 'https://example.com' };
    expect(cardChanges(card, { ...formFromCard(card), website: '   ' })).toEqual({ website: null });
  });

  it('sends the whole address when any part changed', () => {
    const form = formFromCard(CARD);
    form.address.line2 = 'Suite 200';
    expect(cardChanges(CARD, form)).toEqual({
      address: { line1: '100 Congress Ave', line2: 'Suite 200', city: 'Austin', state: 'TX', zip: '78701' },
    });
  });

  it('includes the on/off switch when flipped', () => {
    expect(cardChanges(CARD, { ...formFromCard(CARD), enabled: true })).toEqual({ enabled: true });
  });
});

describe('targetWidth', () => {
  it('only shrinks photos wider than 1200 px', () => {
    expect(targetWidth(4032)).toBe(1200);
    expect(targetWidth(800)).toBeNull();
    expect(targetWidth(undefined)).toBeNull();
  });
});

describe('card address (slug)', () => {
  it('normalizes what the user types', () => {
    expect(normalizeSlug('Smith Law')).toBe('smith-law');
    expect(normalizeSlug('--Austin  Office!')).toBe('austin-office-');
    expect(normalizeSlug('smith--law')).toBe('smith-law');
  });

  it('sends slug in the PATCH for location and member cards only', () => {
    const location = { ...CARD, kind: 'location', slug: 'austin' };
    expect(cardChanges(location, { ...formFromCard(location), slug: 'austin-tx' })).toEqual({ slug: 'austin-tx' });
    // The business card's address uses PUT /digital-cards/slug.
    expect(cardChanges(CARD, { ...formFromCard(CARD), slug: 'smith-law' })).toEqual({});
  });

  it('reports a change only when the address really changed', () => {
    expect(slugChange({ slug: 'austin' }, { slug: 'austin-' })).toBeNull();
    expect(slugChange({ slug: null }, { slug: '' })).toBeNull();
    expect(slugChange({ slug: null }, { slug: 'Smith Law' })).toBe('smith-law');
  });
});
