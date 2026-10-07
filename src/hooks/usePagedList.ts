import { useCallback, useRef, useState } from 'react';

import type { ApiError } from '@/api/types';

import { toApiError, useApiQuery } from './useApiQuery';

/**
 * One page of a list. `next` is what to pass to load() for the following page: a page number
 * for page-based lists, next_cursor (exactly as given) for cursor lists; null when there is no more.
 */
export type Page<T, M, C> = { items: T[]; next: C | null; meta: M };

const byId = (item: unknown) => (item as { id: number }).id;

/**
 * Paged list: the first page loads (and reloads) with `key` via load(null), later pages are
 * appended with loadMore(). `patch` updates one item in place (e.g. after replying).
 */
export function usePagedList<T, M, C = number>(
  key: string,
  load: (cursor: C | null, signal?: AbortSignal) => Promise<Page<T, M, C>>,
  /** Unique per item across pages (default: item.id). Pass a stable function. */
  itemKey: (item: T) => string | number = byId,
) {
  const firstFetcher = useCallback((signal: AbortSignal) => load(null, signal), [load]);
  const first = useApiQuery(key, firstFetcher);

  const [extra, setExtra] = useState<{ items: T[]; next: C | null } | null>(null);
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
  const next = extra ? extra.next : (firstPage?.next ?? null);

  const loadMore = useCallback(async () => {
    if (next === null || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await load(next);
      setExtra((e) => {
        const seen = new Set([...(firstPage?.items ?? []), ...(e?.items ?? [])].map(itemKey));
        return { items: [...(e?.items ?? []), ...page.items.filter((i) => !seen.has(itemKey(i)))], next: page.next };
      });
    } catch (e) {
      setMoreError(toApiError(e));
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [next, load, firstPage, itemKey]);

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
    hasMore: next !== null,
    loadingMore,
    moreError,
    loadMore,
    patch,
  };
}
