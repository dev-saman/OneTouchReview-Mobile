import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type NetworkState = {
  /** null until NetInfo reports. */
  isConnected: boolean | null;
  /** Increments each time the device comes back online; screens refetch on change. */
  reconnectCount: number;
};

const initialState: NetworkState = { isConnected: null, reconnectCount: 0 };

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    connectivityChanged(state, action: PayloadAction<boolean | null>) {
      if (state.isConnected === false && action.payload === true) state.reconnectCount += 1;
      state.isConnected = action.payload;
    },
  },
});

export const networkActions = networkSlice.actions;
export const networkReducer = networkSlice.reducer;
