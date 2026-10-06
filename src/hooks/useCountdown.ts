import { useCallback, useEffect, useState } from 'react';

/**
 * Seconds remaining until an action is allowed again (resend_after, Retry-After,
 * details.retry_after). Based on a wall-clock deadline so it stays correct after
 * the app was in the background.
 */
export function useCountdown(initialSeconds = 0) {
  const [deadline, setDeadline] = useState(() => (initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const start = useCallback((seconds: number) => {
    setNow(Date.now());
    setDeadline(Date.now() + Math.max(0, seconds) * 1000);
  }, []);

  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  return { remaining, active: remaining > 0, start };
}
