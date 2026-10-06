import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ROLE_LABELS } from '@/config/permissions';
import { colors, font, radius, spacing } from '@/constants/theme';
import { signOut } from '@/features/session/sessionThunks';
import { appVersion } from '@/services/device/deviceInfo';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function MoreScreen() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role ?? null);

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need to sign in again on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => dispatch(signOut()) },
    ]);

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={font.small}>Your role</Text>
        <Text style={font.heading}>{role ? ROLE_LABELS[role] : '—'}</Text>
      </View>
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
  version: { textAlign: 'center', marginTop: spacing.xl },
});
