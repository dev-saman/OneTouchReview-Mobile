import { useCallback } from 'react';

import { googleProfileApi } from '@/api/googleProfile.api';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useAppSelector } from '@/store/hooks';

/**
 * Google profile approvals are Pro: GET /locations/{id}/google-profile/changes answers 403
 * PLAN_REQUIRED (or available: false) otherwise, and the menu entry is hidden. null while checking.
 */
export function useGoogleProfileAvailable(): boolean | null {
  const locations = useAppSelector((s) => s.location.locations);
  const selected = useAppSelector((s) => s.location.selected);
  const locationId = typeof selected === 'number' ? selected : (locations[0]?.id ?? null);
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      if (locationId === null) return false;
      try {
        return (await googleProfileApi.changes(locationId, null, signal)).available;
      } catch (e) {
        const error = toApiError(e);
        if (error.kind === 'cancelled') throw e;
        return !(error.code === 'PLAN_REQUIRED' || error.kind === 'forbidden' || error.kind === 'notFound');
      }
    },
    [locationId],
  );
  return useApiQuery(`google-profile-available|${locationId}`, fetcher).data;
}
