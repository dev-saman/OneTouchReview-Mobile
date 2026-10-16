import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { AiReply, GoogleReview, ReplyCoach, ReplyResult, ReviewChange, ReviewNote, ReviewsPage, ReviewTag } from './types';

/** Notifications tab: ai_drafts opens Reviews with status=ai-draft. */
export const AI_DRAFT_STATUS = 'ai-draft';

/**
 * `status` filter values (API-GAPS #22). "negative" is 3 stars and below. Row 69: "changed" (a
 * change in 90 days) and "removed" (removed reviews are left out unless status=removed).
 */
export type ReviewStatus = 'no-reply' | 'negative' | typeof AI_DRAFT_STATUS | 'changed' | 'removed';

/** The waiting AI draft's text, or '' when there is none. */
export const waitingDraftText = (aiReply: AiReply | null | undefined): string =>
  aiReply?.status === 'draft' && aiReply.text ? aiReply.text : '';

export type ReviewsQuery = {
  location: LocationSelection;
  status?: ReviewStatus;
  rating?: number;
  tagId?: number;
  search?: string;
  page: number;
  /** per_page=1 reads only the counts (dashboard). */
  perPage?: number;
};

/** Up to 2000 characters (Endpoints notes). */
export const REPLY_MAX = 2000;
/** reply-coach text: 15–4096 characters. */
export const COACH_MIN = 15;

/** Endpoints tab, rows "4 Reviews". */
export const reviewsApi = {
  list: ({ location, status, rating, tagId, search, page, perPage }: ReviewsQuery, signal?: AbortSignal) =>
    network.get<ReviewsPage>(Paths.googleReviews, {
      signal,
      params: { location_id: location, status, rating, tag_id: tagId, search: search?.trim() || undefined, page, per_page: perPage },
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

  /** Edits with before and after, removed from Google, back again; newest first. */
  changes: async (id: number, signal?: AbortSignal) =>
    (await network.get<{ changes: ReviewChange[] }>(Paths.googleReviewChanges(id), { signal })).changes,

  /** Any role. Replaces the review's tags (up to 10). */
  setTags: async (id: number, tagIds: number[]) =>
    (await network.put<{ tags: ReviewTag[] }>(Paths.googleReviewTags(id), { tag_ids: tagIds })).tags,

  /** Private notes, never shown publicly. Edit / delete: reviewExtrasApi. */
  notes: async (id: number, signal?: AbortSignal) =>
    (await network.get<{ notes: ReviewNote[] }>(Paths.googleReviewNotes(id), { signal })).notes,

  /** 422 NOTE_LIMIT_REACHED. */
  addNote: async (id: number, body: string) =>
    (await network.post<{ note: ReviewNote }>(Paths.googleReviewNotes(id), { body })).note,
};
