import { useCallback, useRef, useState } from 'react';

import type { ApiError } from '@/api/types';

import { toApiError, useApiQuery } from './useApiQuery';

export type Page<T, M> = { items: T[]; nextPage: number | null; meta: M };

const byId = (item: unknown) => (item as { id: number }).id;

/**
 * Page-based list (page=1, 2, …): the first page loads (and reloads) with `key`, later pages
 * are appended with loadMore(). `patch` updates one item in place (e.g. after replying).
 */
export function usePagedList<T, M>(
  key: string,
  load: (page: number, signal?: AbortSignal) => Promise<Page<T, M>>,
  /** Unique per item across pages (default: item.id). Pass a stable function. */
  itemKey: (item: T) => string | number = byId,
) {
  const firstFetcher = useCallback((signal: AbortSignal) => load(1, signal), [load]);
  const first = useApiQuery(key, firstFetcher);

  const [extra, setExtra] = useState<{ items: T[]; nextPage: number | null } | null>(null);
  const [patches, setPatches] = useState<Record<string, Partial<T>>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<ApiError | null>(null);
  const busy = useRef(false);

  // A new first page (refresh / new filters) drops appended pages and local patches.
  const [shownFor, setShownFor] = useState(first.data);
  if (shownFor !== first.data) {
    setShownFor(first.data);
    setExtra(null);
    setPatches({});
    setMoreError(null);
  }

  const firstPage = first.data;
  const items = (firstPage ? [...firstPage.items, ...(extra?.items ?? [])] : []).map((item) =>
    patches[itemKey(item)] ? { ...item, ...patches[itemKey(item)] } : item,
  );
  const nextPage = extra ? extra.nextPage : (firstPage?.nextPage ?? null);

  const loadMore = useCallback(async () => {
    if (nextPage === null || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await load(nextPage);
      setExtra((e) => {
        const seen = new Set([...(firstPage?.items ?? []), ...(e?.items ?? [])].map(itemKey));
        return { items: [...(e?.items ?? []), ...page.items.filter((i) => !seen.has(itemKey(i)))], nextPage: page.nextPage };
      });
    } catch (e) {
      setMoreError(toApiError(e));
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [nextPage, load, firstPage, itemKey]);

  const patch = useCallback((key: string | number, change: Partial<T>) => {
    setPatches((p) => ({ ...p, [key]: { ...p[key], ...change } }));
  }, []);

  return {
    items,
    meta: firstPage?.meta ?? null,
    loading: first.loading,
    error: first.error,
    refreshing: first.refreshing,
    reload: first.reload,
    refresh: first.refresh,
    hasMore: nextPage !== null,
    loadingMore,
    moreError,
    loadMore,
    patch,
  };
}
