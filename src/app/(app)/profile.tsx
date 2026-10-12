import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge, Card } from '@/components/ui/Card';
import { IconTile, type IconName, type TileTone } from '@/components/ui/IconTile';
import { Screen } from '@/components/ui/Screen';
import { ROLE_LABELS } from '@/config/permissions';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { ProfileBanners } from '@/features/profile/ProfileBanners';
import { signOut } from '@/features/session/sessionThunks';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** Screen 14: Profile and sign-in options ("Profile & Security" in the mockups). */
export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need to sign in again on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => dispatch(signOut()) },
    ]);

  return (
    <Screen>
      <ProfileBanners />

      <Card>
        <View style={styles.header}>
          <Avatar name={user.name} size={64} solid />
          <View style={styles.headerText}>
            <Text style={font.heading}>{user.name}</Text>
            <Text style={font.small} numberOfLines={1}>
              {user.email}
            </Text>
            <View style={styles.badges}>
              <Badge label={ROLE_LABELS[user.role]} />
              <Badge
                label={user.email_verified ? 'Email confirmed' : 'Email not confirmed'}
                tone={user.email_verified ? 'success' : 'warning'}
              />
            </View>
          </View>
        </View>
      </Card>

      <Card title="Sign-in & security">
        <Text style={font.small}>
          You can always sign in with a code sent to your email
          {user.has_password ? ' or with your password' : ''}
          {user.google_linked ? ' or with Google' : ''}.
        </Text>
        <View>
          {!user.email_verified ? (
            <Row
              icon="checkmark-circle-outline"
              tone="accent"
              label="Confirm your email"
              note="We'll send a code to your email"
              href="/profile/confirm-email"
            />
          ) : null}
          <Row
            icon="key-outline"
            label={user.has_password ? 'Change password' : 'Set a password'}
            note="Keep your account secure"
            href="/profile/password"
          />
          {user.has_password ? (
            <Row
              icon="trash-outline"
              tone="danger"
              label="Remove password"
              note="Sign in with an email code only"
              href="/profile/remove-password"
            />
          ) : null}
          <Row icon="mail-outline" label="Change sign-in email" note="Update the email you sign in with" href="/profile/change-email" />
          <Row
            icon="phone-portrait-outline"
            label="Signed-in devices"
            note="See and sign out the phones you use"
            href="/profile/devices"
          />
        </View>
        <Text style={font.caption}>Google: {user.google_linked ? 'linked' : 'not linked'}</Text>
      </Card>

      <Pressable
        onPress={confirmSignOut}
        accessibilityRole="button"
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

function Row({
  icon,
  tone = 'brand',
  label,
  note,
  href,
}: {
  icon: IconName;
  tone?: TileTone;
  label: string;
  note?: string;
  href: Href;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconTile name={icon} tone={tone} size={36} />
      <View style={styles.rowText}>
        <Text style={font.body}>{label}</Text>
        {note ? <Text style={font.caption}>{note}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  row: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
  signOut: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: colors.danger },
});
