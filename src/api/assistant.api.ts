import { network } from './network';
import { Paths } from './paths';
import type {
  AssistantAnswer,
  AssistantConversationDetail,
  AssistantConversationsPage,
  AssistantMessage,
  AssistantReport,
  AssistantTraining,
  BookingResult,
  AssistantBooking,
  BookingStatus,
  BotScore,
} from './types';

/** Correction and training answer limits. */
export const CORRECTION_MIN = 2;
export const ASSISTANT_TEXT_MAX = 2000;
export const BOOKING_MESSAGE_MAX = 1000;

/**
 * Endpoints tab, rows "15 Card assistant". Pro or trial: 403 PLAN_REQUIRED hides the screen.
 * Writes are for owners and managers. Assistant settings are web only.
 */
export const assistantApi = {
  conversations: (cursor?: string | null, signal?: AbortSignal) =>
    network.get<AssistantConversationsPage>(Paths.assistantConversations, { signal, params: { cursor: cursor ?? undefined } }),

  conversation: (id: number, signal?: AbortSignal) =>
    network.get<{ conversation: AssistantConversationDetail; messages: AssistantMessage[] }>(Paths.assistantConversation(id), {
      signal,
    }),

  /** "This answer was wrong, it should say …" (2–2000). Saved and used from then on. */
  correct: async (messageId: number, text: string) =>
    (await network.post<{ answer: AssistantAnswer }>(Paths.assistantMessageCorrection(messageId), { text })).answer,

  bookings: async (status?: BookingStatus, signal?: AbortSignal) =>
    (await network.get<{ bookings: AssistantBooking[] }>(Paths.assistantBookings, { signal, params: { status } })).bookings,

  /** We email the visitor. 409 if it isn't new. */
  confirmBooking: (id: number, message?: string) =>
    network.post<BookingResult>(Paths.assistantBookingConfirm(id), message ? { message } : {}),

  /** starts_at: ISO, in the future. We email the visitor. */
  suggestBooking: (id: number, startsAt: string, message?: string) =>
    network.post<BookingResult>(Paths.assistantBookingSuggest(id), { starts_at: startsAt, message: message || undefined }),

  /** Owners and managers: this week's questions (≤ 5) and the bot score. */
  training: (signal?: AbortSignal) => network.get<AssistantTraining>(Paths.assistantTraining, { signal }),

  answerTraining: (id: number, answer: string) =>
    network.post<{ answer: AssistantAnswer; score: BotScore }>(Paths.assistantTrainingAnswer(id), { answer }),

  /** "Not relevant". Unanswered questions roll into next week. */
  dismissTraining: (id: number) => network.post<{ ok: boolean }>(Paths.assistantTrainingDismiss(id)),

  /** Owners and managers. week = YYYY-Www (default last week). */
  report: (week?: string, signal?: AbortSignal) =>
    network.get<AssistantReport>(Paths.assistantReport, { signal, params: { week } }),
};
