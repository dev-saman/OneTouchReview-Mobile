import type { ReviewProfiles, SiteProfileSummary } from '@/api/types';
import type { IconName } from '@/components/ui/IconTile';

/** The Google tab's key. Every other tab is a platform key from the API. */
export const GOOGLE_TAB = 'google';

export type SiteTab = { key: string; label: string };

/**
 * Logos only for sites Ionicons has; every other key — including sites the server adds later —
 * gets the generic star (Start here: "an unknown platform key uses the generic star icon").
 */
const LOGOS: Record<string, IconName> = {
  google: 'logo-google',
  facebook: 'logo-facebook',
};

export const siteIcon = (platform: string): IconName => LOGOS[platform] ?? 'star-outline';

/** "yellowpages" → "Yellowpages": only when the API gave no name at all. */
const fallbackName = (key: string) => (key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/[_-]+/g, ' ') : 'Other site');

/**
 * One tab per platform in by_profile, in the API's order, never from a hardcoded list. Labels from
 * platforms[].name, then a review's platform_name, then the key itself.
 */
export function siteTabs(
  byProfile: Pick<SiteProfileSummary, 'platform'>[],
  platforms: ReviewProfiles['platforms'] = [],
  namesFromReviews: Record<string, string> = {},
): SiteTab[] {
  const tabs: SiteTab[] = [];
  for (const { platform } of byProfile) {
    if (!platform || platform === GOOGLE_TAB || tabs.some((t) => t.key === platform)) continue;
    const label = platforms.find((p) => p.key === platform)?.name || namesFromReviews[platform] || fallbackName(platform);
    tabs.push({ key: platform, label });
  }
  return tabs;
}

/** by_profile summed over a platform's profiles (a site can have several profiles). */
export function platformSummary(byProfile: SiteProfileSummary[], platform: string) {
  const profiles = byProfile.filter((p) => p.platform === platform);
  const count = profiles.reduce((n, p) => n + p.count, 0);
  const rated = profiles.filter((p) => p.average_rating !== null && p.count > 0);
  const ratedCount = rated.reduce((n, p) => n + p.count, 0);
  const average = ratedCount ? rated.reduce((sum, p) => sum + (p.average_rating ?? 0) * p.count, 0) / ratedCount : null;
  const notes = profiles.map((p) => p.import_note).filter((n): n is string => !!n);
  return { count, average, importing: profiles.some((p) => p.importing), notes };
}

/** Review tag colours mapped onto the theme's badge tones (no colours outside theme.ts). */
export function tagTone(color: string | null | undefined): 'neutral' | 'success' | 'warning' | 'danger' {
  switch (color) {
    case 'green':
      return 'success';
    case 'red':
    case 'pink':
      return 'danger';
    case 'orange':
    case 'yellow':
      return 'warning';
    default:
      return 'neutral';
  }
}
