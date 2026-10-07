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

/** DELETE /auth/password: afterwards the user signs in with email codes (or Google). */
export default function RemovePasswordScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const googleLinked = useAppSelector((s) => !!s.auth.user?.google_linked);
  const [current, setCurrent] = useState('');
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      const user = await profileApi.removePassword(current);
      dispatch(authActions.profileUpdated(user));
      Alert.alert('Password removed', 'Next time, sign in with a code sent to your email.');
      router.back();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setRemoving(false);
    }
  };

  const confirm = () =>
    Alert.alert('Remove your password?', 'You’ll sign in with a code sent to your email instead.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: remove },
    ]);

  const currentError = fieldError(error, 'current_password');

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={font.title}>Remove password</Text>
        <Text style={font.small}>
          You’ll sign in with a code sent to your email{googleLinked ? ' or with Google' : ''}. You can set a password
          again at any time.
        </Text>
      </View>
      <TextField
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        error={currentError}
      />
      {error && !currentError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error.message}
        </Text>
      ) : null}
      <Button title="Remove password" variant="danger" onPress={confirm} loading={removing} disabled={!current} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
});
