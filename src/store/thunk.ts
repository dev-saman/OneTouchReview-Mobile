import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';

import type { RootState } from './rootReducer';

export type AppThunk<R = void> = ThunkAction<R, RootState, unknown, UnknownAction>;
