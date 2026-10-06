import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInput } from 'react-native';

import { authApi } from '@/api/auth.api';
import { fieldError } from '@/api/errors';
import { network } from '@/api/network';
import type { ApiError } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, font, spacing } from '@/constants/theme';
import { completeSignIn } from '@/features/session/sessionThunks';
import { useCountdown } from '@/hooks/useCountdown';
import { useAppDispatch } from '@/store/hooks';

/** "Use password instead" (POST /auth/login). The password lives only in this screen's state. */
export default function PasswordScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const cooldown = useCountdown();
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const response = await authApi.login(email.trim(), password);
      setPassword('');
      await dispatch(completeSignIn(response));
    } catch (e) {
      const apiError = network.normalizeError(e);
      // 429 on login: wait the seconds in the Retry-After header.
      if (apiError.retryAfterSeconds) cooldown.start(apiError.retryAfterSeconds);
      setError(apiError);
    } finally {
      setBusy(false);
    }
  };

  const emailError = fieldError(error, 'email');
  const passwordError = fieldError(error, 'password');
  const generalError = error && !emailError && !passwordError ? error.message : null;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={font.title}>Sign in with password</Text>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {generalError ? <Text style={styles.error}>{generalError}</Text> : null}

      <Button
        title={cooldown.active ? `Sign in (${cooldown.remaining}s)` : 'Sign in'}
        onPress={submit}
        loading={busy}
        disabled={cooldown.active || !email.trim() || !password}
      />
      <Button
        title="Forgot password?"
        variant="text"
        onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}
      />
      <Button title="Email me a code instead" variant="text" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: 14 },
});
