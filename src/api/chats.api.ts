import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { Chat, ChatMessage, ChatsPage, ChatStatus } from './types';

export type ChatStatusFilter = ChatStatus | 'all';
export type ChatAssignedFilter = 'any' | 'me' | 'none';

/** Reply body: 1–2000 characters. */
export const CHAT_MESSAGE_MAX = 2000;

/** Endpoints tab, rows "6 Chats". */
export const chatsApi = {
  /** status open/done/all, assigned me/none, location_id, cursor. unread_total for the badge. */
  list: (
    q: { location: LocationSelection; status: ChatStatusFilter; assigned: ChatAssignedFilter; cursor?: string | null },
    signal?: AbortSignal,
  ) =>
    network.get<ChatsPage>(Paths.chats, {
      signal,
      params: {
        location_id: q.location,
        status: q.status,
        assigned: q.assigned === 'any' ? undefined : q.assigned,
        cursor: q.cursor ?? undefined,
      },
    }),

  /** One chat with its messages. */
  get: (id: number, signal?: AbortSignal) =>
    network.get<{ chat: Chat; messages: ChatMessage[] }>(Paths.chat(id), { signal }),

  /** 409 CHAT_BLOCKED. client_id (uuid) is reused when retrying, so a retry can't send twice. */
  send: async (id: number, body: string, clientId: string) =>
    (await network.post<{ message: ChatMessage }>(Paths.chatMessages(id), { body, client_id: clientId })).message,

  markRead: async (id: number) => (await network.post<{ chat: Chat }>(Paths.chatRead(id))).chat,

  /** Mark done / reopen. (Assigning: request field not documented, docs/API-GAPS.md #23.) */
  setStatus: async (id: number, status: ChatStatus) =>
    (await network.patch<{ chat: Chat }>(Paths.chat(id), { status })).chat,

  /** Quick replies; shape of each item not documented (API-GAPS #24): only text items are used. */
  quickReplies: async (signal?: AbortSignal) => {
    const answer = await network.get<{ quick_replies: unknown[] }>(Paths.chatSettings, { signal });
    return (answer.quick_replies ?? []).filter((q): q is string => typeof q === 'string' && !!q.trim());
  },
};
