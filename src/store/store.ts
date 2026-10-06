import { configureStore } from '@reduxjs/toolkit';

import { attachSessionListeners } from './sessionListeners';
import { rootReducer } from './rootReducer';

export function createAppStore() {
  return configureStore({
    reducer: rootReducer,
    devTools: __DEV__,
  });
}

export const store = createAppStore();

attachSessionListeners(store);

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];
export type { RootState } from './rootReducer';
