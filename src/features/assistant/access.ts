import { useCallback } from 'react';

import { assistantApi } from '@/api/assistant.api';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';

/**
 * Card assistant is Pro or trial: GET /assistant/conversations answers 403 PLAN_REQUIRED
 * otherwise, and the screen and menu entry are hidden (no upgrade prompt). null while checking.
 */
export function useAssistantAvailable(): boolean | null {
  const fetcher = useCallback(async (signal: AbortSignal) => {
    try {
      await assistantApi.conversations(null, signal);
      return true;
    } catch (e) {
      const error = toApiError(e);
      if (error.kind === 'cancelled') throw e;
      // Plan or role: hidden. Offline or server trouble: shown, the screen offers Retry.
      return !(error.code === 'PLAN_REQUIRED' || error.kind === 'forbidden' || error.kind === 'notFound');
    }
  }, []);
  return useApiQuery('assistant-available', fetcher).data;
}

/** Readable labels for assistant states and channels. */
export const STATE_LABELS: Record<string, string> = {
  answering: 'Answering',
  needs_details: 'Needs details',
  handed_off: 'Handed to the team',
  limit: 'Monthly limit reached',
  closed: 'Closed',
};

export const channelLabel = (channel: string) => (channel === 'widget' ? 'Website' : channel === 'card' ? 'Card' : channel);
