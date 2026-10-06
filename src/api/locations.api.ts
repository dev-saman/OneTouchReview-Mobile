import type { Location } from '@/features/location/locationSlice';

import { makeError } from './errors';
import { network } from './network';
import { Paths } from './paths';

/**
 * Maps the GET /locations body to Location[].
 *
 * PENDING CAPTURE: the Sheet does not document the response shape. This is filled in
 * from a real test-business response (scripts/capture-responses.mjs). Until then it
 * fails loudly rather than guessing.
 */
export function parseLocations(_body: unknown): Location[] {
  throw makeError('unknown', {
    message: 'Locations response is not mapped yet (waiting for a captured /locations response).',
  });
}

export const locationsApi = {
  list: async (signal?: AbortSignal) => parseLocations(await network.get<unknown>(Paths.locations, { signal })),
};
