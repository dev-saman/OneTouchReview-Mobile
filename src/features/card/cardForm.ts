import type { CardAddress, CardChanges, DigitalCard } from '@/api/types';

/** The edit form: every text field as a string (empty = cleared). */
export type CardForm = {
  name: string;
  title: string;
  bio: string;
  phone: string;
  email: string;
  website: string;
  booking_url: string;
  enabled: boolean;
  address: Record<keyof CardAddress, string>;
};

const TEXT_FIELDS = ['name', 'title', 'bio', 'phone', 'email', 'website', 'booking_url'] as const;
const ADDRESS_FIELDS = ['line1', 'line2', 'city', 'state', 'zip'] as const;

export function formFromCard(card: DigitalCard): CardForm {
  return {
    name: card.name ?? '',
    title: card.title ?? '',
    bio: card.bio ?? '',
    phone: card.phone ?? '',
    email: card.email ?? '',
    website: card.website ?? '',
    booking_url: card.booking_url ?? '',
    enabled: card.enabled,
    address: Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, card.address?.[f] ?? ''])) as CardForm['address'],
  };
}

const clean = (value: string) => (value.trim() ? value.trim() : null);

/** PATCH body with only the fields that changed (trimmed; emptied fields sent as null). */
export function cardChanges(card: DigitalCard, form: CardForm): CardChanges {
  const changes: CardChanges = {};
  for (const field of TEXT_FIELDS) {
    const next = clean(form[field]);
    if (next !== (card[field] ?? null)) changes[field] = next;
  }
  if (form.enabled !== card.enabled) changes.enabled = form.enabled;

  const address = Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, clean(form.address[f])])) as CardAddress;
  const addressChanged = ADDRESS_FIELDS.some((f) => address[f] !== (card.address?.[f] ?? null));
  if (addressChanged) changes.address = address;

  return changes;
}
