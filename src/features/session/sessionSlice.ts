import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ApiError } from '@/api/types';

/**
 * Where the app is in its lifecycle. The router shows exactly one group per phase;
 * nothing protected renders before bootstrap resolves.
 */
export type SessionPhase =
  | 'booting' // splash visible, bootstrap running
  | 'startupError' // cold start could not reach /app-config or validate the user (offline / 5xx)
  | 'updateRequired' // installed version < min_app_version
  | 'suspended' // 403 BUSINESS_SUSPENDED
  | 'signedOut'
  | 'signedIn';

type SessionState = {
  phase: SessionPhase;
  startupError: ApiError | null;
  suspendedMessage: string | null;
};

const initialState: SessionState = {
  phase: 'booting',
  startupError: null,
  suspendedMessage: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    startupFailed(state, action: PayloadAction<ApiError>) {
      state.phase = 'startupError';
      state.startupError = action.payload;
    },
    updateRequired(state) {
      state.phase = 'updateRequired';
      state.startupError = null;
    },
    businessSuspended(state, action: PayloadAction<string>) {
      state.phase = 'suspended';
      state.suspendedMessage = action.payload;
    },
    signedIn(state) {
      state.phase = 'signedIn';
      state.startupError = null;
      state.suspendedMessage = null;
    },
    signedOut(state) {
      state.phase = 'signedOut';
      state.startupError = null;
      state.suspendedMessage = null;
    },
  },
});

export const sessionActions = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
