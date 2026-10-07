import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useAppForeground } from './useAppForeground';

/**
 * Refreshes when the screen comes back into focus or the app returns to the foreground
 * (the app must work without realtime). The first focus is skipped: the screen just loaded.
 */
export function useRefreshOnFocus(refresh: () => void) {
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  useAppForeground(refresh);
}
