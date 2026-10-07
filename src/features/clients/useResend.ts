import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState } from 'react';

import { isTransient } from '@/api/errors';
import { reviewRequestsApi } from '@/api/reviewRequests.api';
import type { ApiError, ReviewRequest } from '@/api/types';
import { toApiError } from '@/hooks/useApiQuery';

export type ResendOutcome = { ok: true; request: ReviewRequest } | { ok: false; error: ApiError };

/**
 * Resend for one screen. Each request keeps the same client_id until the resend succeeds or is
 * refused by the server, so retrying after a timeout or a lost answer can't send twice.
 */
export function useResend() {
  const clientIds = useRef(new Map<number, string>());
  const [pendingId, setPendingId] = useState<number | null>(null);

  const resend = useCallback(async (requestId: number): Promise<ResendOutcome> => {
    let clientId = clientIds.current.get(requestId);
    if (!clientId) {
      clientId = randomUUID();
      clientIds.current.set(requestId, clientId);
    }
    setPendingId(requestId);
    try {
      const request = await reviewRequestsApi.resend(requestId, clientId);
      clientIds.current.delete(requestId);
      return { ok: true, request };
    } catch (e) {
      const error = toApiError(e);
      // Keep the id only when the outcome is unknown (offline, timeout, 5xx): a retry is the same send.
      if (!isTransient(error)) clientIds.current.delete(requestId);
      return { ok: false, error };
    } finally {
      setPendingId(null);
    }
  }, []);

  return { resend, pendingId };
}
