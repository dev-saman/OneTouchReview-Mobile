import { sessionActions } from '@/features/session/sessionSlice';
import { sessionEvents } from '@/services/session/sessionEvents';

import type { AppStore } from './store';

/**
 * Connects network-layer signals to the store:
 * - 401 anywhere → signed out (the token is already gone).
 * - 403 BUSINESS_SUSPENDED → full-screen suspended message.
 */
export function attachSessionListeners(store: Pick<AppStore, 'dispatch' | 'getState'>): () => void {
  const offUnauthorized = sessionEvents.on('unauthorized', () => {
    if (store.getState().session.phase !== 'signedOut') store.dispatch(sessionActions.signedOut());
  });
  const offSuspended = sessionEvents.on('suspended', ({ message }) => {
    store.dispatch(sessionActions.businessSuspended(message));
  });
  return () => {
    offUnauthorized();
    offSuspended();
  };
}
