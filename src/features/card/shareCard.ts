import type { DigitalCard } from '@/api/types';
import type { LocationSelection } from '@/services/storage/prefsStorage';

/** Cards that can be shared: they have a short link to draw as a QR and write to NFC. */
export const shareableCards = (cards: DigitalCard[]) => cards.filter((c) => !!c.short_url);

export const cardLabel = (c: Pick<DigitalCard, 'name' | 'kind'>) =>
  c.name || (c.kind === 'business' ? 'Business card' : c.kind === 'location' ? 'Location card' : 'Team card');

/**
 * Dashboard tab tile 3: the default card is the location card of the chosen location, then the
 * business card, then the first card the user can see.
 */
export function defaultShareCard(cards: DigitalCard[], location: LocationSelection | null): DigitalCard | null {
  return (
    (typeof location === 'number' ? cards.find((c) => c.kind === 'location' && c.location_id === location) : undefined) ??
    cards.find((c) => c.kind === 'business') ??
    cards[0] ??
    null
  );
}

/** The link to share: url, or short_url when url is null (no address set yet). */
export const shareLink = (card: Pick<DigitalCard, 'url' | 'short_url'>) => card.url || card.short_url || '';

/** Share text: "{name}: {link}". */
export const shareMessage = (card: Pick<DigitalCard, 'name' | 'kind' | 'url' | 'short_url'>) =>
  `${cardLabel(card)}: ${shareLink(card)}`;
