import { network } from './network';
import { Paths } from './paths';
import type { DigitalCard } from './types';

/** Endpoints tab, rows "8 My card". */
export const cardsApi = {
  /** The business card and team members' cards, each with url and short_url. */
  list: async (signal?: AbortSignal) =>
    (await network.get<{ cards: DigitalCard[] }>(Paths.digitalCards, { signal })).cards ?? [],
};
