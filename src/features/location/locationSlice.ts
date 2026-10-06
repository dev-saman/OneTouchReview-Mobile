import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { LocationSelection } from '@/services/storage/prefsStorage';

import { sessionActions } from '../session/sessionSlice';

/**
 * Sheet Notifications tab documents location as { id, name }.
 * The GET /locations item is confirmed against a captured response before use.
 */
export type Location = { id: number; name: string };

type LocationState = {
  locations: Location[];
  /** The persisted choice (AsyncStorage), validated against `locations` after they load. */
  selected: LocationSelection | null;
};

const initialState: LocationState = { locations: [], selected: null };

/**
 * Keeps a persisted choice only if it still exists for this business.
 * One location → always that one. Several → the saved one, else "all".
 */
export function resolveSelection(saved: LocationSelection | null, locations: Location[]): LocationSelection | null {
  if (locations.length === 0) return null;
  if (locations.length === 1) return locations[0].id;
  if (saved === 'all') return 'all';
  if (typeof saved === 'number' && locations.some((l) => l.id === saved)) return saved;
  return 'all';
}

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    hydrated(state, action: PayloadAction<LocationSelection | null>) {
      state.selected = action.payload;
    },
    locationsLoaded(state, action: PayloadAction<Location[]>) {
      state.locations = action.payload;
      state.selected = resolveSelection(state.selected, action.payload);
    },
    selected(state, action: PayloadAction<LocationSelection>) {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    // The saved choice stays in AsyncStorage and is re-validated on the next sign-in.
    builder.addCase(sessionActions.signedOut, (state) => {
      state.locations = [];
    });
  },
});

export const locationActions = locationSlice.actions;
export const locationReducer = locationSlice.reducer;
