import { randomUUID } from 'expo-crypto';
import { useCallback, useState } from 'react';

import { chatsApi } from '@/api/chats.api';
import type { ApiError, ChatMessage } from '@/api/types';
import { toApiError } from '@/hooks/useApiQuery';

export type OutgoingMessage = {
  /** Sent as client_id; kept for retries so a retry never sends twice. */
  clientId: string;
  body: string;
  state: 'sending' | 'failed';
  error: ApiError | null;
};

/**
 * Replies for one chat. Each message gets a uuid client_id once; "tap to retry" sends the same
 * client_id again. Sent messages are handed to `onSent` and leave the outbox.
 */
export function useOutbox(chatId: number, onSent: (message: ChatMessage) => void) {
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([]);

  const deliver = useCallback(
    async (item: Pick<OutgoingMessage, 'clientId' | 'body'>) => {
      setOutbox((o) => o.map((m) => (m.clientId === item.clientId ? { ...m, state: 'sending', error: null } : m)));
      try {
        const message = await chatsApi.send(chatId, item.body, item.clientId);
        setOutbox((o) => o.filter((m) => m.clientId !== item.clientId));
        onSent(message);
      } catch (e) {
        const error = toApiError(e);
        setOutbox((o) => o.map((m) => (m.clientId === item.clientId ? { ...m, state: 'failed', error } : m)));
      }
    },
    [chatId, onSent],
  );

  const send = useCallback(
    (body: string) => {
      const item: OutgoingMessage = { clientId: randomUUID(), body, state: 'sending', error: null };
      setOutbox((o) => [...o, item]);
      return deliver(item);
    },
    [deliver],
  );

  const retry = useCallback((clientId: string) => {
    const item = outbox.find((m) => m.clientId === clientId);
    if (item) deliver(item);
  }, [outbox, deliver]);

  const discard = useCallback((clientId: string) => setOutbox((o) => o.filter((m) => m.clientId !== clientId)), []);

  return { outbox, send, retry, discard };
}
