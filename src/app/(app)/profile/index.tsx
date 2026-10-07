import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ROLE_LABELS } from '@/config/permissions';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { ProfileBanners } from '@/features/profile/ProfileBanners';
import { useAppSelector } from '@/store/hooks';

/** Screen 14: Profile and sign-in options. */
export default function ProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;

  return (
    <Screen>
      <ProfileBanners />

      <Card>
        <Text style={font.heading}>{user.name}</Text>
        <View style={styles.emailRow}>
          <Text style={[font.body, styles.email]}>{user.email}</Text>
          <Badge label={user.email_verified ? 'Confirmed' : 'Not confirmed'} tone={user.email_verified ? 'success' : 'warning'} />
        </View>
        <Text style={font.small}>{ROLE_LABELS[user.role]}</Text>
      </Card>

      <Card title="Sign-in options">
        <Text style={font.small}>
          You can always sign in with a code sent to your email
          {user.has_password ? ' or with your password' : ''}
          {user.google_linked ? ' or with Google' : ''}.
        </Text>
        <View>
          <Row
            icon="key-outline"
            label={user.has_password ? 'Change password' : 'Set a password'}
            href="/profile/password"
          />
          {user.has_password ? (
            <Row icon="trash-outline" label="Remove password" href="/profile/remove-password" />
          ) : null}
          <Row icon="mail-outline" label="Change sign-in email" href="/profile/change-email" />
          {!user.email_verified ? (
            <Row icon="checkmark-circle-outline" label="Confirm your email" href="/profile/confirm-email" />
          ) : null}
        </View>
        <Text style={font.caption}>Google: {user.google_linked ? 'linked' : 'not linked'}</Text>
      </Card>
    </Screen>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

function Row({ icon, label, href }: { icon: IconName; label: string; href: Href }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[font.body, styles.rowLabel]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  email: { flexShrink: 1 },
  row: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  rowLabel: { flex: 1 },
});
