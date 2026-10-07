import type { Location } from '@/features/location/locationSlice';

import { makeError } from './errors';
import { network } from './network';
import { Paths } from './paths';

/**
 * Maps the GET /locations body to Location[].
 *
 * Sheet Endpoints tab, "Response example": { locations: [{ id, name, ... }], limits, places, ... }.
 * Only id and name are kept; the switcher needs nothing else.
 */
export function parseLocations(body: unknown): Location[] {
  const list = (body as { locations?: unknown } | null)?.locations;
  if (!Array.isArray(list)) {
    throw makeError('unknown', { message: 'Unexpected locations response.' });
  }
  return list
    .filter((l): l is { id: number; name: string } => typeof l?.id === 'number' && typeof l?.name === 'string')
    .map(({ id, name }) => ({ id, name }));
}

export const locationsApi = {
  list: async (signal?: AbortSignal) => parseLocations(await network.get<unknown>(Paths.locations, { signal })),
};
