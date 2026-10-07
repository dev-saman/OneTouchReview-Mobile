import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ROLE_LABELS } from '@/config/permissions';
import { colors, font, radius, spacing } from '@/constants/theme';
import { signOut } from '@/features/session/sessionThunks';
import { appVersion } from '@/services/device/deviceInfo';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function MoreScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role ?? null;
  const needsAttention = !!user && (!user.email_verified || user.show_password_reminder);

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need to sign in again on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => dispatch(signOut()) },
    ]);

  return (
    <Screen>
      <Pressable
        onPress={() => router.push('/profile/index')}
        accessibilityRole="button"
        accessibilityHint="Opens your profile and sign-in options"
        style={({ pressed }) => [styles.card, styles.profile, pressed && styles.pressed]}
      >
        <View style={styles.profileText}>
          <Text style={font.heading}>{user?.name ?? 'Profile'}</Text>
          {user ? <Text style={font.small}>{user.email}</Text> : null}
          <Text style={font.small}>{role ? ROLE_LABELS[role] : '—'}</Text>
        </View>
        {needsAttention ? <View style={styles.dot} accessibilityLabel="Needs attention" /> : null}
        <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
      </Pressable>
      <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />
      <Text style={[font.caption, styles.version]}>Version {appVersion()}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning },
  version: { textAlign: 'center', marginTop: spacing.xl },
});
