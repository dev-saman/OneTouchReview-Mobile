import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { authApi } from '@/api/auth.api';
import type { DeviceSession } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing } from '@/constants/theme';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { formatDate, formatRelative, humanize } from '@/utils/format';

const platformLabel = (p: DeviceSession['platform']) => (p === 'ios' ? 'iPhone' : p === 'android' ? 'Android' : humanize(p));

/** Screen 1: signed-in devices — sign out one device, or all other devices. */
export default function DevicesScreen() {
  const fetcher = useCallback((signal: AbortSignal) => authApi.sessions(signal), []);
  const q = useApiQuery('sessions', fetcher);
  // Devices signed out from here, hidden until the next load.
  const [removed, setRemoved] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | 'others' | null>(null);

  if (q.loading) return <LoadingView />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;

  const sessions = q.data.filter((s) => !removed.includes(s.id));
  // This phone first.
  const sorted = [...sessions].sort((a, b) => Number(b.current) - Number(a.current));
  const others = sessions.filter((s) => !s.current);

  const run = async (target: number | 'others', action: () => Promise<unknown>, ids: number[]) => {
    setBusy(target);
    try {
      await action();
      setRemoved((r) => [...r, ...ids]);
    } catch (e) {
      Alert.alert('Couldn’t sign out', toApiError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const signOutOne = (s: DeviceSession) =>
    Alert.alert(`Sign out ${s.device_name || 'this device'}?`, 'It will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => run(s.id, () => authApi.signOutDevice(s.id), [s.id]) },
    ]);

  const signOutOthers = () =>
    Alert.alert('Sign out all other devices?', 'Every device except this phone will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out others',
        style: 'destructive',
        onPress: () => run('others', authApi.signOutOtherDevices, others.map((s) => s.id)),
      },
    ]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} />}
    >
      <Card>
        {sorted.map((s, i) => (
          <View key={s.id} style={[styles.row, i > 0 && styles.divider]}>
            <Ionicons
              name={s.platform === 'ios' || s.platform === 'android' ? 'phone-portrait-outline' : 'desktop-outline'}
              size={24}
              color={colors.textMuted}
            />
            <View style={styles.text}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{s.device_name || 'Unnamed device'}</Text>
                {s.current ? <Badge label="This phone" tone="success" /> : null}
              </View>
              <Text style={font.caption}>
                {[
                  platformLabel(s.platform),
                  s.last_used_at ? `Last used ${formatRelative(s.last_used_at)}` : `Signed in ${formatDate(s.created_at)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            {!s.current ? (
              <Button title="Sign out" variant="text" onPress={() => signOutOne(s)} loading={busy === s.id} disabled={busy !== null} />
            ) : null}
          </View>
        ))}
      </Card>
      {others.length ? (
        <Button
          title="Sign out all other devices"
          variant="secondary"
          onPress={signOutOthers}
          loading={busy === 'others'}
          disabled={busy !== null}
        />
      ) : (
        <Text style={[font.small, styles.center]}>Only this phone is signed in.</Text>
      )}
      <Text style={[font.caption, styles.center]}>To sign out this phone, use Sign out on the More tab.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  text: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  center: { textAlign: 'center' },
});
