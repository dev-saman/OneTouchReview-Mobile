import { useRouter } from 'expo-router';
import { useState } from 'react';

import { authApi } from '@/api/auth.api';
import type { ApiError } from '@/api/types';
import { network } from '@/api/network';
import { getGoogleIdToken, isGoogleSignInConfigured } from '@/services/auth/googleSignIn';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

import { completeSignIn } from '../session/sessionThunks';
import { authActions } from './authSlice';

/**
 * "Continue with Google". Hidden when the client IDs are not configured in this build,
 * or after the API answered 503 GOOGLE_SIGNIN_OFF.
 */
export function useGoogleSignIn() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const switchedOff = useAppSelector((s) => s.auth.googleSignInOff);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const visible = isGoogleSignInConfigured() && !switchedOff;

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return; // cancelled
      const response = await authApi.googleIdToken(idToken);
      if (response.is_new_user === true) {
        // New accounts are set up on the web only. The session is not kept in the app.
        router.replace('/finish-on-web');
        return;
      }
      await dispatch(completeSignIn(response));
    } catch (e) {
      const apiError = network.normalizeError(e);
      if (apiError.code === 'GOOGLE_SIGNIN_OFF') {
        dispatch(authActions.googleSignInUnavailable());
        return;
      }
      setError(
        apiError.code || apiError.status
          ? apiError
          : { ...apiError, message: 'Google sign-in failed, try again.' },
      );
    } finally {
      setBusy(false);
    }
  };

  return { visible, busy, error, signIn };
}
