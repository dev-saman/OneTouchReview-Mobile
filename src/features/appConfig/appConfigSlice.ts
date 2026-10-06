import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AppConfig } from '@/api/types';

/** The /app-config answer for this run. Never persisted (no stale version gate). */
type AppConfigState = { config: AppConfig | null };

const initialState: AppConfigState = { config: null };

const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    loaded(state, action: PayloadAction<AppConfig>) {
      state.config = action.payload;
    },
  },
});

export const appConfigActions = appConfigSlice.actions;
export const appConfigReducer = appConfigSlice.reducer;
