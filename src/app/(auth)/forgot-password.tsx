import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authApi } from '@/api/auth.api';
import { fieldError } from '@/api/errors';
import { network } from '@/api/network';
import type { ApiError } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, font, spacing } from '@/constants/theme';
import { useCountdown } from '@/hooks/useCountdown';

/** POST /auth/forgot-password. The reset link in the email opens the web app. */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const cooldown = useCountdown();

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      const apiError = network.normalizeError(e);
      if (apiError.retryAfterSeconds) cooldown.start(apiError.retryAfterSeconds);
      setError(apiError);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <Text style={font.title}>Check your email</Text>
        <Text style={font.body}>
          {`If an account uses ${email.trim()}, we've sent a link to reset the password. ` +
            'The link opens OneTouchReview on the web.'}
        </Text>
        <Button title="Back to sign in" onPress={() => router.dismissTo('/sign-in')} />
      </Screen>
    );
  }

  const emailError = fieldError(error, 'email');

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={font.title}>Reset your password</Text>
        <Text style={font.small}>{"We'll email you a link to set a new password."}</Text>
      </View>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      {error && !emailError ? <Text style={styles.error}>{error.message}</Text> : null}
      <Button
        title={cooldown.active ? `Send reset link (${cooldown.remaining}s)` : 'Send reset link'}
        onPress={submit}
        loading={busy}
        disabled={cooldown.active || !email.trim()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: 14 },
});
