import { openTarget } from '../openTarget';

jest.mock('@/api/reviews.api', () => ({ AI_DRAFT_STATUS: 'ai-draft' }));
jest.mock('@/services/web/openWebApp', () => ({ openWebApp: jest.fn() }));

const router = { push: jest.fn(), navigate: jest.fn() } as unknown as Parameters<typeof openTarget>[0];
const text = { title: 'New 2★ review on Yelp', body: null };

beforeEach(() => jest.clearAllMocks());

describe('openTarget: reviews from other sites and Review Shield', () => {
  it('opens a site review', () => {
    openTarget(router, { type: 'siteReview', id: 44 }, text);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/site-reviews/[id]', params: { id: '44' } });
  });

  it('opens Reviews on the site tab, or the Google list for Google', () => {
    openTarget(router, { type: 'siteReviews', platform: 'yelp', profileId: 3 }, text);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/reviews', params: { source: 'yelp', profile_id: '3' } });
    openTarget(router, { type: 'siteReviews', platform: 'google', profileId: null }, text);
    expect(router.push).toHaveBeenLastCalledWith('/reviews');
  });

  it('opens a Review Shield flag', () => {
    openTarget(router, { type: 'shieldFlag', id: 9 }, text);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/review-shield/[id]', params: { id: '9' } });
  });

  it('opens the Card assistant on a tab, at a booking', () => {
    openTarget(router, { type: 'assistant', tab: 'bookings', bookingId: 4 }, text);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/assistant', params: { tab: 'bookings', booking: '4' } });
    openTarget(router, { type: 'assistant', tab: 'train', bookingId: null }, text);
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/assistant', params: { tab: 'train' } });
  });

  it('opens Google profile approvals for a location with a change on top', () => {
    openTarget(router, { type: 'googleProfile', locationId: 1497, changeId: 6 }, text);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/google-profile', params: { location_id: '1497', change: '6' } });
  });
});
