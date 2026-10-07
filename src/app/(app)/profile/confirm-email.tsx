import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { authApi } from '@/api/auth.api';
import { profileApi } from '@/api/profile.api';
import type { ApiError, EmailCodeResponse } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, font, spacing } from '@/constants/theme';
import { authActions } from '@/features/auth/authSlice';
import { CodeEntry } from '@/features/profile/CodeEntry';
import { toApiError } from '@/hooks/useApiQuery';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** Confirm the current email with a 6-digit code. Never required to use the app. */
export default function ConfirmEmailScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const email = useAppSelector((s) => s.auth.user?.email ?? '');
  const [sent, setSent] = useState<EmailCodeResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const done = () => {
    Alert.alert('Email confirmed', `${email} is confirmed.`);
    router.back();
  };

  /** 409 ALREADY_VERIFIED: reload the user so the banner goes away. */
  const alreadyConfirmed = async () => {
    try {
      const me = await authApi.me();
      dispatch(authActions.identityLoaded(me));
    } catch {
      dispatch(authActions.profileUpdated({ email_verified: true }));
    }
    done();
  };

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      setSent(await profileApi.sendEmailVerifyCode());
    } catch (e) {
      const apiError = toApiError(e);
      if (apiError.code === 'ALREADY_VERIFIED') await alreadyConfirmed();
      else setError(apiError);
    } finally {
      setSending(false);
    }
  };

  const verify = async (code: string) => {
    const user = await profileApi.verifyEmail(code);
    dispatch(authActions.profileUpdated(user));
    done();
  };

  const resend = async () => profileApi.sendEmailVerifyCode();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={font.title}>Confirm your email</Text>
        <Text style={font.small}>This makes sure sign-in codes and account emails reach you at {email}.</Text>
      </View>

      {sent ? (
        <CodeEntry sent={sent} resend={resend} verify={verify} submitLabel="Confirm email" />
      ) : (
        <>
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error.message}
            </Text>
          ) : null}
          <Button title="Email me a code" onPress={send} loading={sending} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
});
