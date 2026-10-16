import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { aiApi } from '@/api/reports.api';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconTile, type IconName } from '@/components/ui/IconTile';
import { Screen } from '@/components/ui/Screen';
import { can, ROLE_LABELS } from '@/config/permissions';
import { colors, font, radius, shadow, spacing, touchTarget } from '@/constants/theme';
import { useAssistantAvailable } from '@/features/assistant/access';
import { signOut } from '@/features/session/sessionThunks';
import { useApiQuery } from '@/hooks/useApiQuery';
import { appVersion } from '@/services/device/deviceInfo';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function MoreScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role ?? null;
  const needsAttention = !!user && (!user.email_verified || user.show_password_reminder);

  // Ask AI: owners and managers, and hidden when /ai/status says it's unavailable.
  const mayAskAi = can(role, 'askAi');
  const aiFetcher = useCallback(
    async (signal: AbortSignal) => (mayAskAi ? (await aiApi.status(signal)).available : false),
    [mayAskAi],
  );
  const ai = useApiQuery(mayAskAi ? 'ai-status' : 'ai-off', aiFetcher);
  const showAskAi = mayAskAi && ai.data === true;
  // Card assistant: hidden when the plan doesn't include it (403 PLAN_REQUIRED).
  const showAssistant = useAssistantAvailable() === true;

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need to sign in again on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => dispatch(signOut()) },
    ]);

  return (
    <Screen>
      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityHint="Opens your profile and sign-in options"
        style={({ pressed }) => [styles.card, styles.profile, pressed && styles.pressed]}
      >
        <Avatar name={user?.name} size={56} solid />
        <View style={styles.profileText}>
          <Text style={font.heading}>{user?.name ?? 'Profile'}</Text>
          {user ? (
            <Text style={font.small} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
          {role ? (
            <View style={styles.role}>
              <Text style={styles.roleText}>{ROLE_LABELS[role]}</Text>
            </View>
          ) : null}
        </View>
        {needsAttention ? <View style={styles.dot} accessibilityLabel="Needs attention" /> : null}
        <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
      </Pressable>
      <View style={[styles.card, styles.menu]}>
        <MenuRow icon="qr-code-outline" label="My card" onPress={() => router.push('/card')} />
        <MenuRow icon="chatbox-ellipses-outline" label="Private feedback" onPress={() => router.push('/feedback')} />
        <MenuRow icon="star-outline" label="Reviews" onPress={() => router.push('/reviews')} />
        <MenuRow icon="people-outline" label="Leads" onPress={() => router.push('/leads')} />
        {showAssistant ? (
          <MenuRow icon="chatbubbles-outline" label="Card assistant" onPress={() => router.push('/assistant')} />
        ) : null}
        <MenuRow icon="bar-chart-outline" label="Reports" onPress={() => router.push('/reports')} />
        {showAskAi ? <MenuRow icon="sparkles-outline" label="Ask AI" onPress={() => router.push('/ask-ai')} /> : null}
        <MenuRow
          icon="notifications-outline"
          label="Notification settings"
          onPress={() => router.push('/notification-settings')}
        />
      </View>
      <Button title="Sign out" variant="secondary" onPress={confirmSignOut} icon="log-out-outline" />
      <Text style={[font.caption, styles.version]}>Version {appVersion()}</Text>
    </Screen>
  );
}

function MenuRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <IconTile name={icon} size={36} />
      <Text style={[font.body, styles.menuLabel]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: { paddingVertical: 0, gap: 0 },
  menuRow: {
    minHeight: touchTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontWeight: '500' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow,
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileText: { flex: 1, gap: 2 },
  role: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  pressed: { opacity: 0.7 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning },
  version: { textAlign: 'center', marginTop: spacing.xl },
});
