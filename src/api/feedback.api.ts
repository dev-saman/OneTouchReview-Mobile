import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { FeedbackPage, FeedbackSource, PrivateFeedback } from './types';

export type FeedbackFilter = 'all' | 'urgent' | 'low';

/** Endpoints tab, rows "5 Feedback". */
export const feedbackApi = {
  /** Urgent first by default. Filters: location_id, urgent=1, rating_max, page. */
  list: (location: LocationSelection, filter: FeedbackFilter, page: number, signal?: AbortSignal) =>
    network.get<FeedbackPage>(Paths.privateFeedback, {
      signal,
      params: {
        location_id: location,
        urgent: filter === 'urgent' ? 1 : undefined,
        rating_max: filter === 'low' ? 3 : undefined,
        page,
      },
    }),

  /** source=request (default) or card. */
  get: async (id: number, source: FeedbackSource | undefined, signal?: AbortSignal) =>
    (
      await network.get<{ feedback: PrivateFeedback }>(Paths.privateFeedbackItem(id), {
        signal,
        params: { source: source === 'card' ? 'card' : undefined },
      })
    ).feedback,

  /** "Suggested reply to send yourself" (review-request feedback). */
  suggestReply: async (id: number) =>
    (await network.post<{ ai_reply: string }>(Paths.reviewResponseAiReply(id))).ai_reply,
};
