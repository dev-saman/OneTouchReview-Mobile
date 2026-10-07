import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { AiAnswer, Insights, OwnerReport, ReportFrequency, ReviewPoints } from './types';

/** Endpoints tab, rows "12 Reports". location_id as the other screens (answers echo it). */
export const reportsApi = {
  insights: (location: LocationSelection, signal?: AbortSignal) =>
    network.get<Insights>(Paths.insights, { signal, params: { location_id: location } }),

  /** What people like / don't like. */
  points: (location: LocationSelection, signal?: AbortSignal) =>
    network.get<ReviewPoints>(Paths.reviewPoints, { signal, params: { location_id: location } }),

  /** Weekly / monthly report numbers. Owners and managers. */
  ownerReport: async (frequency: ReportFrequency, signal?: AbortSignal) =>
    (await network.get<{ report: OwnerReport }>(Paths.ownerReportPreview, { signal, params: { frequency } })).report,
};

/** Ask AI: owners and managers; hidden when /ai/status says unavailable. */
export const aiApi = {
  status: (signal?: AbortSignal) => network.get<{ available: boolean; reason: unknown }>(Paths.aiStatus, { signal }),

  suggestions: (signal?: AbortSignal) =>
    network.get<{ suggestions: string[]; asks_left_today: number; daily_limit: number }>(Paths.aiAskSuggestions, { signal }),

  /**
   * "Keep the last 6 turns as history": the turn format isn't in the Sheet yet (docs/API-GAPS.md #27),
   * so history is sent empty until it is.
   */
  ask: (question: string) => network.post<AiAnswer>(Paths.aiAsk, { question, history: [] }),
};
