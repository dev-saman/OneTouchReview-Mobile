import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type {
  ReviewNote,
  ReviewProfiles,
  ReviewShieldFlag,
  ReviewsSummary,
  ReviewTag,
  SiteAiReply,
  SiteReview,
  SiteReviewsPage,
  SummarySource,
  TagColor,
} from './types';

export type SiteReviewsQuery = {
  location: LocationSelection;
  /** A platform key from by_profile (never a hardcoded list). */
  platform?: string;
  profileId?: number;
  rating?: number;
  tagId?: number;
  search?: string;
  page: number;
};

/** POST /site-reviews/{id}/reply: 1–4000 characters. */
export const SITE_REPLY_MAX = 4000;
/** 50 tags per business (TAG_LIMIT_REACHED), up to 10 per review. */
export const TAGS_PER_REVIEW_MAX = 10;

/** Endpoints tab, rows "4 Reviews (all sites)". 503 SITE_REVIEWS_OFF: show Google only. */
export const siteReviewsApi = {
  list: ({ location, platform, profileId, rating, tagId, search, page }: SiteReviewsQuery, signal?: AbortSignal) =>
    network.get<SiteReviewsPage>(Paths.siteReviews, {
      signal,
      params: {
        location_id: location,
        platform,
        profile_id: profileId,
        rating,
        tag_id: tagId,
        search: search?.trim() || undefined,
        page,
      },
    }),

  /** site_review push and bell deep link. 404 if gone. */
  get: async (id: number, signal?: AbortSignal) =>
    (await network.get<{ review: SiteReview }>(Paths.siteReview(id), { signal })).review,

  /** Suggested reply: copy it and open reply_url. 402 QUOTA_EXHAUSTED / AI_PAUSED as Google. */
  aiReply: (id: number, regenerate = false) =>
    network.post<SiteAiReply>(Paths.siteReviewAiReply(id), regenerate ? { regenerate: true } : {}),

  /** Owners and managers, only where can_reply is true. Post or edit. */
  postReply: async (id: number, text: string) =>
    (await network.post<{ review: SiteReview }>(Paths.siteReviewReply(id), { text })).review,

  /** Owners and managers, only when owner_response.can_edit. 404 NO_REPLY. */
  deleteReply: async (id: number) => (await network.delete<{ review: SiteReview }>(Paths.siteReviewReply(id))).review,

  /** Replaces the review's tags (≤ 10). */
  setTags: async (id: number, tagIds: number[]) =>
    (await network.put<{ tags: ReviewTag[] }>(Paths.siteReviewTags(id), { tag_ids: tagIds })).tags,

  notes: async (id: number, signal?: AbortSignal) =>
    (await network.get<{ notes: ReviewNote[] }>(Paths.siteReviewNotes(id), { signal })).notes,

  addNote: async (id: number, body: string) =>
    (await network.post<{ note: ReviewNote }>(Paths.siteReviewNotes(id), { body })).note,

  /** A location's connected sites, plus platforms[] (every site's name, for tab labels). Adding a site is web only. */
  profiles: (locationId: number, signal?: AbortSignal) =>
    network.get<ReviewProfiles>(Paths.locationReviewProfiles(locationId), { signal, params: { platform: 'all' } }),
};

/** Shared by Google and site reviews: AI summary, tags, notes, Review Shield (read-only). */
export const reviewExtrasApi = {
  /** summary null: hide the card. */
  summary: (location: LocationSelection, source: SummarySource, signal?: AbortSignal) =>
    network.get<ReviewsSummary>(Paths.reviewsSummary, { signal, params: { location_id: location, source } }),

  /** Owners and managers, 5 an hour. */
  refreshSummary: (location: LocationSelection, source: SummarySource) =>
    network.post<ReviewsSummary>(Paths.reviewsSummaryRefresh, { location_id: location, source }),

  tags: async (signal?: AbortSignal) => (await network.get<{ tags: ReviewTag[] }>(Paths.reviewTags, { signal })).tags,

  /** Owners and managers. 422 TAG_NAME_TAKEN, TAG_LIMIT_REACHED. Rename / delete is web only. */
  createTag: async (name: string, color?: TagColor) =>
    (await network.post<{ tag: ReviewTag }>(Paths.reviewTags, { name, color })).tag,

  /** The author, owners and managers (note.can_edit). */
  editNote: async (id: number, body: string) =>
    (await network.patch<{ note: ReviewNote }>(Paths.reviewNote(id), { body })).note,

  deleteNote: (id: number) => network.delete<{ message: string }>(Paths.reviewNote(id)),

  /** Owners and managers. Reporting is web only. */
  shieldFlag: async (id: number, signal?: AbortSignal) =>
    (await network.get<{ flag: ReviewShieldFlag }>(Paths.reviewShieldFlag(id), { signal })).flag,
};
