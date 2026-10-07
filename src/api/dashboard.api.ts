import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { Dashboard, Usage } from './types';

/** Endpoints tab, rows "7 Dashboard". */
export const dashboardApi = {
  /** "location_id optional": omitted for all locations (answer has location_id: null). */
  get: (location: LocationSelection, signal?: AbortSignal) =>
    network.get<Dashboard>(Paths.dashboard, {
      signal,
      params: { location_id: location === 'all' ? undefined : location },
    }),

  /** "Messages used this month" plus this period vs the previous one. */
  usage: (location: LocationSelection, signal?: AbortSignal) =>
    network.get<Usage>(Paths.usage, { signal, params: { location_id: location } }),
};
