import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type {
  AiAnswer,
  AiHistoryTurn,
  Attribution,
  AttributionReviewsPage,
  FollowUpResults,
  Insights,
  OwnerReport,
  ReportFrequency,
  ReviewPoints,
} from './types';

export type AttributionGroup = 'likely' | 'unlinked';

/** Endpoints tab, rows "12 Reports". location_id as the other screens (answers echo it). */
export const reportsApi = {
  insights: (location: LocationSelection, signal?: AbortSignal) =>
    network.get<Insights>(Paths.insights, { signal, params: { location_id: location } }),

  /** What people like / don't like. */
  points: (location: LocationSelection, signal?: AbortSignal) =>
    network.get<ReviewPoints>(Paths.reviewPoints, { signal, params: { location_id: location } }),

  /** Reviews that likely came from requests, cards or QR codes (default last 30 days). Never "left" a review. */
  attribution: (location: LocationSelection, signal?: AbortSignal) =>
    network.get<Attribution>(Paths.attribution, { signal, params: { location_id: location } }),

  /** The reviews behind those numbers. Staff get request.customer null. */
  attributionReviews: (location: LocationSelection, group: AttributionGroup, cursor?: string | null, signal?: AbortSignal) =>
    network.get<AttributionReviewsPage>(Paths.attributionReviews, {
      signal,
      params: { location_id: location, group, cursor: cursor ?? undefined },
    }),

  /** days = 30 | 90. Follow-up settings are web only. */
  followUps: (location: LocationSelection, days: 30 | 90, signal?: AbortSignal) =>
    network.get<FollowUpResults>(Paths.followUpResults, { signal, params: { location_id: location, days } }),

  /** Weekly / monthly report numbers. Owners and managers. */
  ownerReport: async (frequency: ReportFrequency, signal?: AbortSignal) =>
    (await network.get<{ report: OwnerReport }>(Paths.ownerReportPreview, { signal, params: { frequency } })).report,
};

/** Ask AI: owners and managers; hidden when /ai/status says unavailable. */
export const aiApi = {
  status: (signal?: AbortSignal) => network.get<{ available: boolean; reason: unknown }>(Paths.aiStatus, { signal }),

  suggestions: (signal?: AbortSignal) =>
    network.get<{ suggestions: string[]; asks_left_today: number; daily_limit: number }>(Paths.aiAskSuggestions, { signal }),

  /** history: the last 6 turns as { role: user | assistant, content } (API-GAPS #27). */
  ask: (question: string, history: AiHistoryTurn[]) => network.post<AiAnswer>(Paths.aiAsk, { question, history }),
};
