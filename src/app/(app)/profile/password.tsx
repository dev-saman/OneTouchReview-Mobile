import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { fieldError } from '@/api/errors';
import { profileApi } from '@/api/profile.api';
import type { ApiError } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, font, spacing } from '@/constants/theme';
import { authActions } from '@/features/auth/authSlice';
import { toApiError } from '@/hooks/useApiQuery';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** PUT /auth/password: set a password, or change it (current password only when has_password). */
export default function PasswordScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hasPassword = useAppSelector((s) => !!s.auth.user?.has_password);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSave = password.length > 0 && confirmation.length > 0 && !mismatch && (!hasPassword || current.length > 0);

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const user = await profileApi.setPassword({
        password,
        passwordConfirmation: confirmation,
        currentPassword: hasPassword ? current : undefined,
      });
      dispatch(authActions.profileUpdated(user));
      Alert.alert(hasPassword ? 'Password changed' : 'Password set', 'Your other devices stay signed in.');
      router.back();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSaving(false);
    }
  };

  // Field errors go under their field; anything else is shown above the button.
  const fieldMessages = {
    current: fieldError(error, 'current_password'),
    password: fieldError(error, 'password'),
    confirmation: fieldError(error, 'password_confirmation'),
  };
  const generalError = error && !Object.values(fieldMessages).some(Boolean) ? error.message : null;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={font.title}>{hasPassword ? 'Change password' : 'Set a password'}</Text>
        <Text style={font.small}>
          {hasPassword
            ? 'Enter your current password, then the new one twice.'
            : 'Sign in faster with your email and a password. Email codes keep working too.'}
        </Text>
      </View>

      {hasPassword ? (
        <TextField
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          error={fieldMessages.current}
        />
      ) : null}
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={fieldMessages.password}
      />
      <TextField
        label="Confirm new password"
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={mismatch ? 'The passwords don’t match.' : fieldMessages.confirmation}
        onSubmitEditing={save}
      />

      {generalError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {generalError}
        </Text>
      ) : null}
      <Button title={hasPassword ? 'Change password' : 'Set password'} onPress={save} loading={saving} disabled={!canSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
});
