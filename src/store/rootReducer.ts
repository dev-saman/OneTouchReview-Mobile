import { combineReducers } from '@reduxjs/toolkit';

import { appConfigReducer } from '@/features/appConfig/appConfigSlice';
import { authReducer } from '@/features/auth/authSlice';
import { locationReducer } from '@/features/location/locationSlice';
import { networkReducer } from '@/features/network/networkSlice';
import { sessionReducer } from '@/features/session/sessionSlice';

/** Global state only. Screen data lives in screen hooks, not here. */
export const rootReducer = combineReducers({
  session: sessionReducer,
  auth: authReducer,
  appConfig: appConfigReducer,
  location: locationReducer,
  network: networkReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
