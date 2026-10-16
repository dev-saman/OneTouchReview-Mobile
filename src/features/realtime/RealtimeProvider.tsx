import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { realtimeApi } from '@/api/realtime.api';
import { PusherClient, reverbUrl } from '@/services/realtime/pusherClient';
import { useAppSelector } from '@/store/hooks';

/** chat.message { chat_id, message } and chat.updated { chat_id } (API-GAPS #2). */
export type ChatEvent = { type: 'message' | 'updated'; chatId: number };

type Listener = (event: ChatEvent) => void;

const Context = createContext<{ listeners: Set<Listener>; connected: boolean } | null>(null);

export const chatChannel = (businessId: number) => `private-business.${businessId}.chats`;

/** Reads a chat event's chat id (numbers or numeric strings); null for anything else. */
export function chatEventFrom(event: string, data: unknown): ChatEvent | null {
  const type = event === 'chat.message' ? 'message' : event === 'chat.updated' ? 'updated' : null;
  const raw = (data as { chat_id?: unknown } | null)?.chat_id;
  const chatId = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : null;
  return type && chatId !== null ? { type, chatId } : null;
}

/**
 * Realtime chats over Laravel Reverb (config from /app-config reverb; null = off). Connected only
 * while the app is in the foreground and online; the screens keep refreshing on focus anyway.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const reverb = useAppSelector((s) => s.appConfig.config?.reverb ?? null);
  const businessId = useAppSelector((s) => s.auth.business?.id ?? null);
  const online = useAppSelector((s) => s.network.isConnected !== false);
  const [listeners] = useState(() => new Set<Listener>());
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setActive(next === 'active'));
    return () => sub.remove();
  }, []);

  const host = reverb?.host;
  const port = reverb?.port;
  const key = reverb?.key;
  const scheme = reverb?.scheme;
  useEffect(() => {
    if (!host || !key || !port || businessId === null || !active || !online) return;
    const client = new PusherClient({
      url: reverbUrl({ host, port, key, scheme: scheme ?? 'https' }),
      authorize: realtimeApi.authorize,
      onEvent: (_channel, event, data) => {
        const chatEvent = chatEventFrom(event, data);
        if (chatEvent) for (const listener of listeners) listener(chatEvent);
      },
      onConnectedChange: (value) => {
        // Development only: the state, never tokens or chat content.
        if (__DEV__) console.log(`[realtime] ${value ? 'subscribed' : 'disconnected'}`);
        setConnected(value);
      },
    });
    client.subscribe(chatChannel(businessId));
    client.connect();
    return () => {
      client.disconnect();
      setConnected(false);
    };
  }, [host, port, key, scheme, businessId, active, online, listeners]);

  return <Context.Provider value={{ listeners, connected }}>{children}</Context.Provider>;
}

/** Coalesces a burst of events into one call after `delayMs` (e.g. one list refetch). */
export function useChatEventsRefresh(refresh: () => void, filter: (event: ChatEvent) => boolean = () => true, delayMs = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useChatEvents((event) => {
    if (!filter(event)) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      refresh();
    }, delayMs);
  });
}

/** Calls `onEvent` for every chat event while mounted. */
export function useChatEvents(onEvent: Listener) {
  const context = useContext(Context);
  const callback = useRef(onEvent);
  useEffect(() => {
    callback.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    if (!context) return;
    const listener: Listener = (event) => callback.current(event);
    context.listeners.add(listener);
    return () => {
      context.listeners.delete(listener);
    };
  }, [context]);
}
