import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Business, User } from '@/api/types';

import { sessionActions } from '../session/sessionSlice';

type AuthState = {
  user: User | null;
  business: Business | null;
  /** 503 GOOGLE_SIGNIN_OFF seen this run → hide "Continue with Google". Not persisted. */
  googleSignInOff: boolean;
};

const initialState: AuthState = {
  user: null,
  business: null,
  googleSignInOff: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    identityLoaded(state, action: PayloadAction<{ user: User; business: Business }>) {
      state.user = action.payload.user;
      state.business = action.payload.business;
    },
    googleSignInUnavailable(state) {
      state.googleSignInOff = true;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sessionActions.signedOut, (state) => {
      state.user = null;
      state.business = null;
    });
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
