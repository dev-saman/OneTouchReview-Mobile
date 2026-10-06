import { network } from './network';
import { Paths } from './paths';
import type { AppConfig } from './types';

export const appConfigApi = {
  /** No token. Versions, realtime (Reverb) settings, push on/off. */
  get: (signal?: AbortSignal) => network.get<AppConfig>(Paths.appConfig, { signal, requiresAuth: false }),
};
