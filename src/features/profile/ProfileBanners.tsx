import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { profileApi } from '@/api/profile.api';
import { Button } from '@/components/ui/Button';
import { colors, font, radius, spacing } from '@/constants/theme';
import { authActions } from '@/features/auth/authSlice';
import { toApiError } from '@/hooks/useApiQuery';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * "Confirm your email" (user.email_verified false — never blocks the app) and
 * "Set a password for faster sign-in" (user.show_password_reminder; Not now hides it for 7 days).
 */
export function ProfileBanners() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [dismissing, setDismissing] = useState(false);

  if (!user) return null;
  const showConfirm = !user.email_verified;
  const showReminder = user.show_password_reminder;
  if (!showConfirm && !showReminder) return null;

  const dismiss = async () => {
    setDismissing(true);
    try {
      await profileApi.dismissPasswordReminder();
      dispatch(authActions.profileUpdated({ show_password_reminder: false }));
    } catch (e) {
      Alert.alert('Couldn’t hide the reminder', toApiError(e).message);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <View style={styles.stack}>
      {showConfirm ? (
        <Pressable
          onPress={() => router.push('/profile/confirm-email')}
          accessibilityRole="button"
          accessibilityHint="Opens email confirmation"
          style={({ pressed }) => [styles.banner, styles.warning, pressed && styles.pressed]}
        >
          <Ionicons name="mail-unread-outline" size={20} color={colors.warning} />
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.warning }]}>Confirm your email</Text>
            <Text style={font.small}>We’ll send a code to {user.email}.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.warning} />
        </Pressable>
      ) : null}

      {showReminder ? (
        <View style={[styles.banner, styles.info]}>
          <Ionicons name="key-outline" size={20} color={colors.primary} />
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.primary }]}>Set a password for faster sign-in</Text>
            <Text style={font.small}>You can still sign in with an email code.</Text>
            <View style={styles.actions}>
              <Button title="Set password" onPress={() => router.push('/profile/password')} style={styles.action} />
              <Button title="Not now" variant="text" onPress={dismiss} loading={dismissing} style={styles.action} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radius.md, padding: spacing.md },
  warning: { backgroundColor: colors.warningSurface },
  info: { backgroundColor: '#EFF6FF' },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: { minHeight: 40 },
});
