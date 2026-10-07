import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiError, makeError } from '@/api/errors';
import type { ApiError } from '@/api/types';

export function toApiError(error: unknown): ApiError {
  return isApiError(error) ? error : makeError('unknown');
}

type Result<T> = { runKey: string | null; data: T | null; error: ApiError | null };

/**
 * Screen data for one request. Loads whenever `key` (the screen's inputs, e.g. the location)
 * changes or reload() is called. Answers are tagged with the inputs they belong to, so `loading`
 * is true until the newest inputs have an answer. A newer run cancels the older one.
 */
export function useApiQuery<T>(key: string | number, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result<T>>({ runKey: null, data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const fetcherRef = useRef(fetcher);
  const runKey = `${key}#${reloads}`;

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    fetcherRef.current(current.signal).then(
      (data) => {
        if (!current.signal.aborted) setResult({ runKey, data, error: null });
      },
      (error: unknown) => {
        const apiError = toApiError(error);
        if (current.signal.aborted || apiError.kind === 'cancelled') return;
        setResult({ runKey, data: null, error: apiError });
      },
    );
    return () => current.abort();
  }, [runKey]);

  /** Pull to refresh / refresh on focus: what is on screen stays until the new answer arrives. */
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setRefreshing(true);
    try {
      const data = await fetcherRef.current(current.signal);
      if (!current.signal.aborted) setResult({ runKey, data, error: null });
    } catch (error) {
      const apiError = toApiError(error);
      // A failed refresh keeps the data on screen; only an empty screen shows the error.
      if (!current.signal.aborted && apiError.kind !== 'cancelled') {
        setResult((r) => (r.runKey === runKey && r.data !== null ? r : { runKey, data: null, error: apiError }));
      }
    } finally {
      setRefreshing(false);
    }
  }, [runKey]);

  const reload = useCallback(() => setReloads((n) => n + 1), []);

  const isCurrent = result.runKey === runKey;
  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    loading: !isCurrent,
    refreshing,
    reload,
    refresh,
  };
}
