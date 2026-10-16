import { useCallback } from 'react';

import { reviewExtrasApi, siteReviewsApi } from '@/api/siteReviews.api';
import type { ReviewProfiles, ReviewTag, SiteProfileSummary } from '@/api/types';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';

import { siteTabs, type SiteTab } from './sites';

export type SiteTabsData = { tabs: SiteTab[]; byProfile: SiteProfileSummary[] };

const NONE: SiteTabsData = { tabs: [], byProfile: [] };

/**
 * The connected review sites for the Reviews tabs: GET /site-reviews?per_page=1 → by_profile, named
 * from GET /locations/{id}/review-profiles?platform=all → platforms[]. Any failure (incl. 503
 * SITE_REVIEWS_OFF) leaves Google only: the Google reviews never depend on it.
 */
export function useSiteTabs(location: LocationSelection) {
  const locations = useAppSelector((s) => s.location.locations);
  // platforms[] is every site the server knows; any location of the business gives it.
  const namesFrom = typeof location === 'number' ? location : (locations[0]?.id ?? null);

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<SiteTabsData> => {
      const [page, profiles] = await Promise.all([
        siteReviewsApi.list({ location, page: 1, perPage: 1 }, signal).catch(() => null),
        namesFrom !== null
          ? siteReviewsApi.profiles(namesFrom, signal).catch((): ReviewProfiles | null => null)
          : Promise.resolve(null),
      ]);
      if (!page) return NONE;
      const names = Object.fromEntries(page.reviews.map((r) => [r.platform, r.platform_name]));
      return { tabs: siteTabs(page.by_profile, profiles?.platforms, names), byProfile: page.by_profile };
    },
    [location, namesFrom],
  );
  const q = useApiQuery(`site-tabs|${location}`, fetcher);
  return { ...(q.data ?? NONE), refresh: q.refresh };
}

/** The business's review tags (any role). Empty when they can't load: tags are optional. */
export function useReviewTags() {
  const fetcher = useCallback((signal: AbortSignal) => reviewExtrasApi.tags(signal).catch((): ReviewTag[] => []), []);
  const q = useApiQuery('review-tags', fetcher);
  return { tags: q.data ?? [], refresh: q.refresh };
}
