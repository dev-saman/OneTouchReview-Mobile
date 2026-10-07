import { useCallback, useEffect, useRef, useState } from 'react';

import { customersApi } from '@/api/customers.api';
import type { ApiError, Customer } from '@/api/types';
import { toApiError } from '@/hooks/useApiQuery';
import type { LocationSelection } from '@/services/storage/prefsStorage';

type State = {
  items: Customer[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  /** First page failed: nothing to show. */
  error: ApiError | null;
  /** A later page failed: the list stays, with a retry at the bottom. */
  moreError: ApiError | null;
};

const INITIAL: State = {
  items: [],
  nextCursor: null,
  hasMore: false,
  loading: true,
  refreshing: false,
  loadingMore: false,
  error: null,
  moreError: null,
};

/** GET /customers with search, Not sent and cursor paging (next_cursor / has_more). */
export function useClientsList(location: LocationSelection, search: string, notSent: boolean) {
  const [state, setState] = useState<State>(INITIAL);
  const controller = useRef<AbortController | null>(null);
  // Inputs of the list on screen, so a late page never lands in a different list.
  const generation = useRef(0);

  const loadFirst = useCallback(
    async (mode: 'load' | 'refresh') => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      const gen = ++generation.current;
      setState((s) => (mode === 'load' ? { ...INITIAL } : { ...s, refreshing: true, moreError: null }));
      try {
        const page = await customersApi.list({ location, search, notSent }, current.signal);
        if (gen !== generation.current) return;
        setState({
          ...INITIAL,
          loading: false,
          items: page.customers,
          nextCursor: page.next_cursor,
          hasMore: page.has_more && !!page.next_cursor,
        });
      } catch (error) {
        const apiError = toApiError(error);
        if (gen !== generation.current || apiError.kind === 'cancelled') return;
        setState((s) => ({ ...s, loading: false, refreshing: false, error: s.items.length ? null : apiError }));
      }
    },
    [location, search, notSent],
  );

  useEffect(() => {
    loadFirst('load');
    return () => controller.current?.abort();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    const { hasMore, nextCursor, loadingMore, loading, refreshing } = state;
    if (!hasMore || !nextCursor || loadingMore || loading || refreshing) return;
    const gen = generation.current;
    setState((s) => ({ ...s, loadingMore: true, moreError: null }));
    try {
      const page = await customersApi.list({ location, search, notSent, cursor: nextCursor });
      if (gen !== generation.current) return;
      setState((s) => {
        const seen = new Set(s.items.map((c) => c.id));
        return {
          ...s,
          loadingMore: false,
          items: [...s.items, ...page.customers.filter((c) => !seen.has(c.id))],
          nextCursor: page.next_cursor,
          hasMore: page.has_more && !!page.next_cursor,
        };
      });
    } catch (error) {
      if (gen !== generation.current) return;
      setState((s) => ({ ...s, loadingMore: false, moreError: toApiError(error) }));
    }
  }, [state, location, search, notSent]);

  const reload = useCallback(() => loadFirst('load'), [loadFirst]);
  const refresh = useCallback(() => loadFirst('refresh'), [loadFirst]);

  return { ...state, reload, refresh, loadMore };
}
