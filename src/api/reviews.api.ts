import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { GoogleReview, ReplyCoach, ReplyResult, ReviewsPage } from './types';

/** Notifications tab: ai_drafts opens Reviews with status=ai-draft (the only documented status value). */
export const AI_DRAFT_STATUS = 'ai-draft';

export type ReviewsQuery = {
  location: LocationSelection;
  status?: typeof AI_DRAFT_STATUS;
  rating?: number;
  search?: string;
  page: number;
};

/** Up to 2000 characters (Endpoints notes). */
export const REPLY_MAX = 2000;
/** reply-coach text: 15–4096 characters. */
export const COACH_MIN = 15;

/** Endpoints tab, rows "4 Reviews". */
export const reviewsApi = {
  list: ({ location, status, rating, search, page }: ReviewsQuery, signal?: AbortSignal) =>
    network.get<ReviewsPage>(Paths.googleReviews, {
      signal,
      params: { location_id: location, status, rating, search: search?.trim() || undefined, page },
    }),

  get: async (id: number, signal?: AbortSignal) =>
    (await network.get<{ review: GoogleReview }>(Paths.googleReview(id), { signal })).review,

  /** AI draft. 402 when the AI allowance is used up (code: docs/API-GAPS.md #5). */
  aiDraft: async (id: number) => (await network.post<{ reply: string }>(Paths.googleReviewAiReply(id))).reply,

  /** Post a new reply. */
  postReply: (id: number, reply: string) => network.post<ReplyResult>(Paths.googleReviewReply(id), { reply }),

  /** Edit the posted reply. */
  editReply: (id: number, reply: string) => network.patch<ReplyResult>(Paths.googleReviewReply(id), { reply }),

  /** Remove the posted reply. */
  deleteReply: (id: number) => network.delete<unknown>(Paths.googleReviewReply(id)),

  /** Tips for a reply the user typed (15–4096 characters). */
  coach: (id: number, text: string) => network.post<ReplyCoach>(Paths.googleReviewReplyCoach(id), { text }),
};
