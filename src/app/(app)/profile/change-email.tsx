import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { fieldError } from '@/api/errors';
import { profileApi } from '@/api/profile.api';
import type { ApiError, EmailCodeResponse } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, font, spacing } from '@/constants/theme';
import { authActions } from '@/features/auth/authSlice';
import { CodeEntry } from '@/features/profile/CodeEntry';
import { toApiError } from '@/hooks/useApiQuery';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** Change the sign-in email: step 1 sends a code to the new address, step 2 confirms it. */
export default function ChangeEmailScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentEmail = useAppSelector((s) => s.auth.user?.email ?? '');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<EmailCodeResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const requestCode = async () => {
    const value = email.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      setSent(await profileApi.requestEmailChange(value));
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSending(false);
    }
  };

  const verify = async (code: string) => {
    const user = await profileApi.confirmEmailChange(code);
    dispatch(authActions.profileUpdated(user));
    Alert.alert('Email changed', `You now sign in with ${user.email}. We let your old address know.`);
    router.back();
  };

  /** EMAIL_TAKEN while the code was out: back to step 1 with the message under the field. */
  const onVerifyError = (apiError: ApiError) => {
    if (apiError.code !== 'EMAIL_TAKEN') return false;
    setSent(null);
    setError(apiError);
    return true;
  };

  const emailError = fieldError(error, 'email');

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={font.title}>Change sign-in email</Text>
        <Text style={font.small}>Currently {currentEmail}. We’ll send a code to the new address to make sure it’s yours.</Text>
      </View>

      {sent ? (
        <>
          <CodeEntry
            sent={sent}
            resend={() => profileApi.requestEmailChange(email.trim())}
            verify={verify}
            submitLabel="Change email"
            onVerifyError={onVerifyError}
          />
          <Button title="Use a different email" variant="text" onPress={() => setSent(null)} />
        </>
      ) : (
        <>
          <TextField
            label="New email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={requestCode}
            error={emailError}
          />
          {error && !emailError ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error.message}
            </Text>
          ) : null}
          <Button title="Send code" onPress={requestCode} loading={sending} disabled={!email.trim()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
});
