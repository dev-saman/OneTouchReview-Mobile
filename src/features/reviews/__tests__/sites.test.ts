import type { SiteProfileSummary } from '@/api/types';

import { platformSummary, siteIcon, siteTabs, tagTone } from '../sites';

const profile = (platform: string, count: number, average: number | null, extra: Partial<SiteProfileSummary> = {}): SiteProfileSummary => ({
  profile_id: count,
  name: null,
  platform,
  count,
  average_rating: average,
  site_rating_kind: 'stars',
  importing: false,
  import_note: null,
  ...extra,
});

describe('siteTabs', () => {
  it('makes one tab per platform from by_profile, labelled from platforms[]', () => {
    expect(
      siteTabs([profile('avvo', 2, 5), profile('yelp', 2, 5), profile('avvo', 1, 4)], [
        { key: 'avvo', name: 'Avvo', enabled: true },
        { key: 'yelp', name: 'Yelp', enabled: false },
      ]),
    ).toEqual([
      { key: 'avvo', label: 'Avvo' },
      { key: 'yelp', label: 'Yelp' },
    ]);
  });

  it('shows a site the app has never heard of, named by the API', () => {
    expect(siteTabs([profile('newsite', 1, 4)], [], { newsite: 'New Site' })).toEqual([{ key: 'newsite', label: 'New Site' }]);
    expect(siteTabs([profile('yellow_pages', 1, 4)])).toEqual([{ key: 'yellow_pages', label: 'Yellow pages' }]);
  });

  it('never repeats Google as a site tab', () => {
    expect(siteTabs([profile('google', 3, 5)])).toEqual([]);
  });
});

describe('siteIcon', () => {
  it('uses the generic star for unknown platforms', () => {
    expect(siteIcon('facebook')).toBe('logo-facebook');
    expect(siteIcon('avvo')).toBe('star-outline');
  });
});

describe('platformSummary', () => {
  it('adds up a platform with several profiles', () => {
    const summary = platformSummary(
      [profile('avvo', 2, 5), profile('avvo', 2, 4, { importing: true, import_note: 'Importing older reviews' }), profile('yelp', 9, 1)],
      'avvo',
    );
    expect(summary).toEqual({ count: 4, average: 4.5, importing: true, notes: ['Importing older reviews'] });
    expect(platformSummary([profile('bbb', 0, null)], 'bbb').average).toBeNull();
  });
});

describe('tagTone', () => {
  it('maps tag colours onto badge tones', () => {
    expect(tagTone('green')).toBe('success');
    expect(tagTone('red')).toBe('danger');
    expect(tagTone('yellow')).toBe('warning');
    expect(tagTone('blue')).toBe('neutral');
    expect(tagTone(undefined)).toBe('neutral');
  });
});
