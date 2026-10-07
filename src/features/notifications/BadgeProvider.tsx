import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { notificationsApi } from '@/api/notifications.api';
import { selectSelectedLocation } from '@/features/location/selectors';
import { toApiError } from '@/hooks/useApiQuery';
import { useAppForeground } from '@/hooks/useAppForeground';
import { setAppBadge } from '@/services/push/push';
import { useAppSelector } from '@/store/hooks';

/** Build guide: refresh every 60 s while the app is open. */
const POLL_MS = 60_000;

type BadgeContext = {
  /** Unread items for the chosen location (plus account items). */
  count: number;
  /** false after a 404 (older API): hide the bell. */
  available: boolean;
  /** Mark-read answers carry the new unread_count: use it directly. */
  setCount: (count: number) => void;
  refresh: () => void;
};

const Context = createContext<BadgeContext>({ count: 0, available: false, setCount: () => {}, refresh: () => {} });

export const useNotificationBadge = () => useContext(Context);

/**
 * Bell unread count (screen 13). Not Redux: it is screen-facing state shared by the header
 * and the list. Refreshes on start, on location change, on foreground and every 60 s,
 * and mirrors the count on the app icon badge.
 */
export function NotificationBadgeProvider({ children }: { children: ReactNode }) {
  const location = useAppSelector(selectSelectedLocation);
  const [count, setCountState] = useState(0);
  const [available, setAvailable] = useState(true);
  const controller = useRef<AbortController | null>(null);

  /** Starts a count request; a newer one cancels the older. Resolves only for the newest. */
  const fetchCount = useCallback(() => {
    if (location === null) return Promise.resolve(null);
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    return notificationsApi.unreadCount(location, current.signal).then(
      (unread) => (current.signal.aborted ? null : { unread }),
      (e: unknown) =>
        // 404: this API has no bell yet. Anything else (offline, 5xx): keep the last count.
        !current.signal.aborted && toApiError(e).kind === 'notFound' ? { notFound: true as const } : null,
    );
  }, [location]);

  const apply = useCallback((result: { unread: number } | { notFound: true } | null) => {
    if (!result) return;
    if ('notFound' in result) {
      setAvailable(false);
    } else {
      setCountState(result.unread);
      setAvailable(true);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchCount().then(apply);
  }, [fetchCount, apply]);

  useEffect(() => {
    fetchCount().then(apply);
    const id = setInterval(() => {
      if (AppState.currentState === 'active') fetchCount().then(apply);
    }, POLL_MS);
    return () => {
      clearInterval(id);
      controller.current?.abort();
    };
  }, [fetchCount, apply]);

  useAppForeground(refresh);

  // App icon badge = the bell count. Cleared when signed out (this provider unmounts).
  useEffect(() => {
    setAppBadge(available ? count : 0);
  }, [count, available]);
  useEffect(() => () => setAppBadge(0), []);

  const value = useMemo(
    () => ({ count, available, setCount: setCountState, refresh }),
    [count, available, refresh],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
