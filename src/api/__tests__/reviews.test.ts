import { tokenStorage } from '@/services/storage/tokenStorage';

import { mockHttp } from '../../../tests/httpMock';
import { reviewsApi, waitingDraftText } from '../reviews.api';

const draft = (status: string, text: string | null) => ({ status, text, scheduled_at: null, posted_at: null, reason: null });

describe('waitingDraftText', () => {
  it('returns the text of a waiting draft only', () => {
    expect(waitingDraftText(draft('draft', 'Thanks for visiting!'))).toBe('Thanks for visiting!');
    expect(waitingDraftText(draft('posted', 'Thanks!'))).toBe('');
    expect(waitingDraftText(draft('draft', null))).toBe('');
    expect(waitingDraftText(null)).toBe('');
  });
});

describe('reviewsApi.list', () => {
  beforeEach(async () => {
    tokenStorage.__resetForTests();
    await tokenStorage.save('tok', new Date(Date.now() + 80 * 86_400_000).toISOString());
  });

  it('sends the status filter and leaves out empty params', async () => {
    const calls = mockHttp(() => ({
      status: 200,
      data: { reviews: [], current_page: 1, last_page: 1, total: 0, filtered_total: 0, need_reply_count: 0, negative_count: 0, ai_drafts: 0, avg_rating: null },
    }));
    await reviewsApi.list({ location: 'all', status: 'no-reply', page: 1, search: '  ' });
    expect(calls[0].url).toBe('/google-reviews');
    expect(calls[0].params).toEqual({ location_id: 'all', status: 'no-reply', page: 1 });
  });
});
