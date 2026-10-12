import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authApi } from '@/api/auth.api';
import { fieldError, makeError } from '@/api/errors';
import { network } from '@/api/network';
import type { ApiError } from '@/api/types';
import { AuthHeader, OrDivider } from '@/components/ui/AuthHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing } from '@/constants/theme';
import { useGoogleSignIn } from '@/features/auth/useGoogleSignIn';
import { useCountdown } from '@/hooks/useCountdown';

const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

/** Default sign-in: email → "Send me a code" (POST /auth/email-code). */
export default function SignInScreen() {
  const router = useRouter();
  const google = useGoogleSignIn();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const cooldown = useCountdown();

  const sendCode = async () => {
    const trimmed = email.trim();
    if (!isEmail(trimmed)) {
      setError(makeError('validation', { fieldErrors: { email: ['Enter your email address.'] } }));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await authApi.requestEmailCode(trimmed);
      router.push({
        pathname: '/code',
        params: {
          email: trimmed,
          masked: res.email_masked,
          resendAfter: String(res.resend_after),
          expiresIn: String(res.expires_in),
        },
      });
    } catch (e) {
      const apiError = network.normalizeError(e);
      if (apiError.retryAfterSeconds) cooldown.start(apiError.retryAfterSeconds);
      setError(apiError);
    } finally {
      setSending(false);
    }
  };

  const emailError = fieldError(error, 'email');
  const generalError = error && !emailError ? error.message : null;

  return (
    <Screen edges={['top', 'bottom']}>
      <AuthHeader title="Welcome back" subtitle="Sign in to your OneTouchReview account. We'll email you a 6-digit code." />

      <TextField
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={sendCode}
      />

      {generalError ? <Text style={styles.error}>{generalError}</Text> : null}

      <Button
        title={cooldown.active ? `Continue (${cooldown.remaining}s)` : 'Continue'}
        onPress={sendCode}
        loading={sending}
        disabled={cooldown.active}
      />
      <OrDivider />
      <Button
        title="Use password instead"
        variant="secondary"
        icon="lock-closed-outline"
        onPress={() => router.push({ pathname: '/password', params: { email: email.trim() } })}
      />

      {google.visible ? (
        <View style={styles.google}>
          <Button title="Continue with Google" variant="secondary" onPress={google.signIn} loading={google.busy} />
          {google.error ? <Text style={styles.error}>{google.error.message}</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 14 },
  google: { gap: spacing.sm, marginTop: spacing.md },
});
