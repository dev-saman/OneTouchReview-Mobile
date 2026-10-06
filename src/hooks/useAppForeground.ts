import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Calls `onForeground` each time the app returns from the background (not on first mount). */
export function useAppForeground(onForeground: () => void) {
  const callback = useRef(onForeground);

  useEffect(() => {
    callback.current = onForeground;
  }, [onForeground]);

  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous.match(/inactive|background/) && next === 'active') callback.current();
      previous = next;
    });
    return () => subscription.remove();
  }, []);
}
