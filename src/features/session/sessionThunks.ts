import { appConfigApi } from '@/api/appConfig.api';
import { authApi } from '@/api/auth.api';
import { isTransient } from '@/api/errors';
import { locationsApi } from '@/api/locations.api';
import { network } from '@/api/network';
import type { ApiError, SignInResponse } from '@/api/types';
import { appVersion, devicePlatform } from '@/services/device/deviceInfo';
import { prefsStorage, type LocationSelection } from '@/services/storage/prefsStorage';
import { tokenStorage } from '@/services/storage/tokenStorage';
import type { AppThunk } from '@/store/thunk';
import { isBelowMinimum } from '@/utils/version';

import { appConfigActions } from '../appConfig/appConfigSlice';
import { authActions } from '../auth/authSlice';
import { locationActions } from '../location/locationSlice';
import { sessionActions } from './sessionSlice';

/**
 * 401 and BUSINESS_SUSPENDED are already handled by the session listeners
 * (they change the phase); everything else becomes a startup error with Retry.
 */
function handleStartupError(error: ApiError): AppThunk {
  return (dispatch) => {
    if (error.kind === 'unauthorized' || error.code === 'BUSINESS_SUSPENDED') return;
    dispatch(sessionActions.startupFailed(error));
  };
}

/** Loads the locations and applies the validated, persisted choice. */
function loadLocations(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const locations = await locationsApi.list();
    dispatch(locationActions.locationsLoaded(locations));
    const resolved = getState().location.selected;
    await prefsStorage.setSelectedLocation(resolved).catch(() => undefined);
  };
}

/** With a stored token: refresh if due, then /auth/me and /locations, then enter the app. */
function restoreSession(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    try {
      await network.refreshTokenIfDue();
    } catch (error) {
      const apiError = network.normalizeError(error);
      // A 401 already signed out. Anything else keeps the current token (still valid for its 90 days).
      if (apiError.kind === 'unauthorized') return;
    }

    try {
      const me = await authApi.me();
      dispatch(authActions.identityLoaded({ user: me.user, business: me.business }));
      await dispatch(loadLocations());
      dispatch(sessionActions.signedIn());
    } catch (error) {
      dispatch(handleStartupError(network.normalizeError(error)));
    }
  };
}

/**
 * Cold start, in order:
 * 1. safe prefs (AsyncStorage)  2. token (SecureStore)  3. GET /app-config
 * 4. version gate  5. refresh if due  6. GET /auth/me  7. GET /locations
 * 8. validate the saved location  9. enter the app.
 *
 * /app-config failure → Retry screen (no cached config, no bypassing the version gate).
 * Offline before /auth/me succeeds → Retry screen (no cached identity). The token is kept.
 */
export function runBootstrap(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    const prefs = await prefsStorage.load();
    dispatch(locationActions.hydrated(prefs.selectedLocation));
    const stored = await tokenStorage.load();

    let config;
    try {
      config = await appConfigApi.get();
    } catch (error) {
      dispatch(sessionActions.startupFailed(network.normalizeError(error)));
      return;
    }
    dispatch(appConfigActions.loaded(config));

    if (isBelowMinimum(appVersion(), config.min_app_version?.[devicePlatform])) {
      dispatch(sessionActions.updateRequired());
      return;
    }

    if (!stored) {
      dispatch(sessionActions.signedOut());
      return;
    }

    await dispatch(restoreSession());
  };
}

/** Any successful sign-in (code, password or Google): store the token, load locations, enter. */
export function completeSignIn(response: SignInResponse): AppThunk<Promise<void>> {
  return async (dispatch) => {
    await tokenStorage.save(response.token, response.token_expires_at ?? null);
    dispatch(authActions.identityLoaded({ user: response.user, business: response.business }));
    try {
      await dispatch(loadLocations());
      dispatch(sessionActions.signedIn());
    } catch (error) {
      dispatch(handleStartupError(network.normalizeError(error)));
    }
  };
}

/** User-initiated sign out. POST /auth/logout also stops push to this phone. */
export function signOut(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    if (tokenStorage.get()) {
      // Best effort: if offline the local session still ends; the server session expires on its own.
      await authApi.logout().catch(() => undefined);
    }
    await tokenStorage.clear().catch(() => undefined);
    dispatch(sessionActions.signedOut());
  };
}

export function selectLocation(selection: LocationSelection): AppThunk<Promise<void>> {
  return async (dispatch) => {
    dispatch(locationActions.selected(selection));
    await prefsStorage.setSelectedLocation(selection).catch(() => undefined);
  };
}

/** On returning to the foreground: refresh when fewer than 30 days remain. Failures are silent. */
export function refreshOnForeground(): AppThunk<Promise<void>> {
  return async (_dispatch, getState) => {
    if (getState().session.phase !== 'signedIn') return;
    await network.refreshTokenIfDue().catch((error) => {
      const apiError = network.normalizeError(error);
      if (!isTransient(apiError) && __DEV__) console.log(`[auth] refresh failed: ${apiError.kind}`);
    });
  };
}
