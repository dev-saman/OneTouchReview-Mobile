import { useCallback, useRef, useState } from 'react';

import { notificationsApi } from '@/api/notifications.api';
import type { ApiError, AppNotification } from '@/api/types';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import type { LocationSelection } from '@/services/storage/prefsStorage';

import { useNotificationBadge } from './BadgeProvider';

/** GET /notifications: first page via useApiQuery, then "load more" with next_cursor, plus local read marks. */
export function useNotificationsList(location: LocationSelection) {
  const { setCount } = useNotificationBadge();
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const page = await notificationsApi.list(location, null, signal);
      setCount(page.unread_count);
      return page;
    },
    [location, setCount],
  );
  const first = useApiQuery(location, fetcher);

  // Later pages and read marks, reset whenever a new first page arrives.
  const [extra, setExtra] = useState<{ items: AppNotification[]; cursor: string | null; hasMore: boolean } | null>(null);
  const [readIds, setReadIds] = useState<Record<number, string>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<ApiError | null>(null);
  const [shownFor, setShownFor] = useState(first.data);
  if (shownFor !== first.data) {
    setShownFor(first.data);
    setExtra(null);
    setReadIds({});
    setMoreError(null);
  }
  const loadingMoreRef = useRef(false);

  const page = first.data;
  const items = (page ? [...page.notifications, ...(extra?.items ?? [])] : []).map((n) =>
    readIds[n.id] && !n.read_at ? { ...n, read_at: readIds[n.id] } : n,
  );
  const cursor = extra ? extra.cursor : (page?.next_cursor ?? null);
  const hasMore = !!cursor && (extra ? extra.hasMore : !!page?.has_more);

  const loadMore = useCallback(async () => {
    if (!cursor || !hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const next = await notificationsApi.list(location, cursor);
      setExtra((e) => {
        const seen = new Set([...(page?.notifications ?? []), ...(e?.items ?? [])].map((n) => n.id));
        return {
          items: [...(e?.items ?? []), ...next.notifications.filter((n) => !seen.has(n.id))],
          cursor: next.next_cursor,
          hasMore: next.has_more,
        };
      });
    } catch (e) {
      setMoreError(toApiError(e));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [cursor, hasMore, location, page]);

  const markReadLocally = useCallback((ids: number[], at = new Date().toISOString()) => {
    setReadIds((r) => ({ ...r, ...Object.fromEntries(ids.map((id) => [id, at])) }));
  }, []);

  return {
    items,
    loading: first.loading,
    error: first.error,
    refreshing: first.refreshing,
    reload: first.reload,
    refresh: first.refresh,
    hasMore,
    loadingMore,
    moreError,
    loadMore,
    markReadLocally,
  };
}
