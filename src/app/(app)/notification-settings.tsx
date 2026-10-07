import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { devicesApi } from '@/api/devices.api';
import type { NotificationPreferences } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, radius, spacing } from '@/constants/theme';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useAppForeground } from '@/hooks/useAppForeground';
import { pushPermission, type PushPermission } from '@/services/push/push';

type Key = keyof NotificationPreferences;

/** Screen 3: push settings — the four documented switches (GET/PUT /notification-preferences). */
export default function NotificationSettingsScreen() {
  const fetcher = useCallback(async (signal: AbortSignal) => {
    const [prefs, permission] = await Promise.all([devicesApi.preferences(signal), pushPermission()]);
    return { prefs, permission: permission.status };
  }, []);
  const q = useApiQuery('push-prefs', fetcher);
  // Coming back from the phone's Settings may have changed the permission.
  useAppForeground(q.refresh);

  // Switch changes shown right away, rolled back if the save fails.
  const [overrides, setOverrides] = useState<Partial<NotificationPreferences>>({});
  const [saving, setSaving] = useState<Key | null>(null);

  if (q.loading) return <LoadingView />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;
  const prefs: NotificationPreferences = { ...q.data.prefs, ...overrides };

  const change = async (key: Key, value: boolean) => {
    setOverrides((o) => ({ ...o, [key]: value }));
    setSaving(key);
    try {
      const saved = await devicesApi.updatePreferences({ [key]: value });
      setOverrides((o) => ({ ...o, ...pick(saved) }));
    } catch (e) {
      setOverrides((o) => ({ ...o, [key]: !value }));
      Alert.alert('Couldn’t save', toApiError(e).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} />}
    >
      <PermissionNote permission={q.data.permission} />

      <Card title="Send me a push for">
        <Toggle label="New chat messages" value={prefs.chats} busy={saving === 'chats'} onChange={(v) => change('chats', v)} />
        <Toggle
          label="New private feedback"
          value={prefs.private_feedback}
          busy={saving === 'private_feedback'}
          onChange={(v) => change('private_feedback', v)}
        />
        <Toggle
          label="Only 1–3 ★ feedback"
          value={prefs.private_feedback_low_only}
          busy={saving === 'private_feedback_low_only'}
          disabled={!prefs.private_feedback}
          onChange={(v) => change('private_feedback_low_only', v)}
          indent
        />
        <Toggle
          label="New Google reviews"
          value={prefs.google_reviews}
          busy={saving === 'google_reviews'}
          onChange={(v) => change('google_reviews', v)}
        />
      </Card>
    </ScrollView>
  );
}

const pick = (p: NotificationPreferences): NotificationPreferences => ({
  chats: p.chats,
  private_feedback: p.private_feedback,
  private_feedback_low_only: p.private_feedback_low_only,
  google_reviews: p.google_reviews,
});

function PermissionNote({ permission }: { permission: PushPermission }) {
  if (Platform.OS === 'ios') {
    // iOS registration waits for the token-type answer (docs/API-GAPS.md #1).
    return (
      <View style={styles.note}>
        <Text style={font.body}>Push to iPhone isn’t switched on yet.</Text>
        <Text style={font.small}>The bell in the app still shows everything new.</Text>
      </View>
    );
  }
  if (permission === 'granted') return null;
  return (
    <View style={styles.note}>
      <Text style={font.body}>Notifications are off for OneTouchReview on this phone.</Text>
      <Button title="Open phone settings" variant="secondary" onPress={() => Linking.openSettings()} />
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
  busy,
  disabled,
  indent,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  busy: boolean;
  disabled?: boolean;
  indent?: boolean;
}) {
  return (
    <View style={[styles.toggle, indent && styles.indent]}>
      <Text style={[font.body, styles.flex, disabled && styles.disabled]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={busy || disabled}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  note: { backgroundColor: colors.warningSurface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  indent: { paddingLeft: spacing.xl },
  flex: { flex: 1 },
  disabled: { color: colors.textSubtle },
});
