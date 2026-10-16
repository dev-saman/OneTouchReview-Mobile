import type { Lead } from '@/api/types';
import { humanize } from '@/utils/format';

const SOURCE_LABELS: Record<string, string> = {
  assistant_card: 'Card assistant',
  assistant_website: 'Website assistant',
  card_chat: 'Card chat',
  card_form: 'Card form',
  booking: 'Booking',
};

/** Source chips; a source the server adds later still gets a readable label. */
export const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? humanize(source);

/** Source chips from counts.by_source, in the API's order, zero counts left out. */
export function sourceChips(bySource: Record<string, number> | undefined): { value: string; label: string }[] {
  return Object.entries(bySource ?? {})
    .filter(([, count]) => count > 0)
    .map(([source, count]) => ({ value: source, label: `${sourceLabel(source)} (${count})` }));
}

/** Leads tab: "Phone given by the visitor (not verified)". */
export const phoneNote = (lead: Pick<Lead, 'phone' | 'phone_verified'>) =>
  lead.phone && !lead.phone_verified ? 'Phone given by the visitor (not verified)' : null;
