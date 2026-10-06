import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { network } from '@/api/network';
import { networkActions } from '@/features/network/networkSlice';
import type { AppDispatch } from '@/store/store';

/** null while unknown; false only when the OS reports no connection. */
export function connectedFrom(state: Pick<NetInfoState, 'isConnected'>): boolean | null {
  return state.isConnected ?? null;
}

/** Feeds connectivity to the network layer (offline short-circuit) and the store (banner, refetch). */
export function startConnectivity(dispatch: AppDispatch): () => void {
  return NetInfo.addEventListener((state) => {
    const connected = connectedFrom(state);
    network.setOnline(connected);
    dispatch(networkActions.connectivityChanged(connected));
  });
}
