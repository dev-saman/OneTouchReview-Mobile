import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { googleProfileApi } from '@/api/googleProfile.api';
import type { GoogleProfileChange } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { can } from '@/config/permissions';
import { colors, font, radius, spacing } from '@/constants/theme';
import { changeFirst, makesHours247, needsRiskConfirm, riskWarning } from '@/features/googleProfile/rules';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { openWebApp } from '@/services/web/openWebApp';
import { useAppSelector } from '@/store/hooks';
import { formatDate } from '@/utils/format';

const toId = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);

/**
 * Screen 17, Google profile approvals (Pro: hidden on 403 PLAN_REQUIRED). Per location: waiting
 * for approval, queued, waiting for Google, and history. Owners and managers approve, decline or
 * undo where change.can allows; staff see it read-only. Editing the profile is web only.
 * Opened with ?location_id=&change= from a push or the bell.
 */
export default function GoogleProfileScreen() {
  const params = useLocalSearchParams<{ location_id?: string; change?: string }>();
  const locations = useAppSelector((s) => s.location.locations);
  const selected = useAppSelector((s) => s.location.selected);
  const fromLink = toId(params.location_id);
  const [locationId, setLocationId] = useState<number | null>(
    fromLink ?? (typeof selected === 'number' ? selected : (locations[0]?.id ?? null)),
  );

  if (locationId === null) return <EmptyState icon="business-outline" title="No locations yet" />;
  return (
    <View style={styles.screen}>
      {locations.length > 1 ? (
        <View style={styles.tabs}>
          <Chips
            options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
            value={String(locationId)}
            onChange={(v) => setLocationId(Number(v))}
          />
        </View>
      ) : null}
      <Approvals key={locationId} locationId={locationId} changeId={locationId === fromLink ? toId(params.change) : null} />
    </View>
  );
}

function Approvals({ locationId, changeId }: { locationId: number; changeId: number | null }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  const canAct = can(role, 'managerDashboard');
  const fetcher = useCallback((signal: AbortSignal) => googleProfileApi.changes(locationId, null, signal), [locationId]);
  const q = useApiQuery(`google-profile|${locationId}`, fetcher);
  useRefreshOnFocus(q.refresh);
  const [busy, setBusy] = useState<string | null>(null);
  const [editsOff, setEditsOff] = useState(false);
  const [more, setMore] = useState<{ for: unknown; items: GoogleProfileChange[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  if (q.loading) return <LoadingView />;
  if (!q.data) {
    if (q.error && (q.error.code === 'PLAN_REQUIRED' || q.error.kind === 'forbidden')) {
      return <EmptyState icon="business-outline" title="Google profile approvals aren’t available" message="They aren’t switched on for this account." />;
    }
    return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;
  }
  const data = q.data;
  if (!data.available) {
    return <EmptyState icon="business-outline" title="Google profile approvals aren’t available" message="They aren’t switched on for this account." />;
  }
  if (!data.connected) {
    return (
      <View style={styles.center}>
        <EmptyState icon="logo-google" title="Google isn’t connected" message="Connect Google on the web to manage profile changes." />
        <Button title="Open on the web" variant="secondary" onPress={() => openWebApp()} />
      </View>
    );
  }

  const extra = more && more.for === data ? more : null;
  const history = [...data.history, ...(extra?.items ?? [])];
  const cursor = extra ? extra.cursor : data.next_cursor;

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await googleProfileApi.changes(locationId, cursor);
      setMore({ for: data, items: [...(extra?.items ?? []), ...page.history], cursor: page.next_cursor });
    } catch (e) {
      Alert.alert('Couldn’t load more', toApiError(e).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const act = async (change: GoogleProfileChange, action: 'approve' | 'decline' | 'undo', options: { confirmRisky?: boolean; confirm247?: boolean } = {}) => {
    setBusy(`${action}:${change.id}`);
    try {
      if (action === 'approve') await googleProfileApi.approve(change.id, options);
      else if (action === 'decline') await googleProfileApi.decline(change.id);
      else await googleProfileApi.undo(change.id);
      Alert.alert(
        action === 'approve' ? 'Approved' : action === 'decline' ? 'Declined' : 'Undo requested',
        action === 'approve' ? 'It goes to Google next.' : action === 'undo' ? 'The undo now waits for approval.' : undefined,
      );
    } catch (e) {
      const error = toApiError(e);
      if (error.code === 'GOOGLE_PROFILE_EDITS_OFF') setEditsOff(true);
      Alert.alert('Couldn’t do that', error.message);
    } finally {
      setBusy(null);
      // WRONG_STATUS (already handled) and every success: the groups change, so reload.
      q.refresh();
    }
  };

  const approve = (change: GoogleProfileChange) => {
    const hours247 = makesHours247(change);
    const go = () => act(change, 'approve', { confirmRisky: needsRiskConfirm(change), confirm247: hours247 });
    if (!needsRiskConfirm(change) && !hours247) return go();
    const warnings = [needsRiskConfirm(change) ? riskWarning(change) : null, hours247 ? 'This makes your hours open 24/7 on Google.' : null];
    Alert.alert(`Approve the ${change.field_label.toLowerCase()} change?`, warnings.filter(Boolean).join('\n\n'), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: go },
    ]);
  };

  const decline = (change: GoogleProfileChange) =>
    Alert.alert(`Decline the ${change.field_label.toLowerCase()} change?`, 'It won’t go to Google.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => act(change, 'decline') },
    ]);

  const card = (change: GoogleProfileChange) => (
    <ChangeCard
      key={change.id}
      change={change}
      highlighted={change.id === changeId}
      busy={busy}
      onApprove={canAct && change.can.approve && !editsOff && data.enabled ? () => approve(change) : undefined}
      onDecline={canAct && change.can.decline ? () => decline(change) : undefined}
      onUndo={canAct && change.can.undo ? () => act(change, 'undo') : undefined}
    />
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} />}
    >
      {data.queue?.paused ? (
        <View style={styles.paused}>
          <Text style={styles.pausedTitle}>Sending to Google is paused</Text>
          {data.queue.reason_text ? <Text style={font.small}>{data.queue.reason_text}</Text> : null}
        </View>
      ) : null}
      {!canAct ? <Text style={font.small}>Owners and managers approve changes. You can see them here.</Text> : null}

      <Section title="Waiting for your approval" empty="Nothing waits for your approval.">
        {changeFirst(data.waiting, changeId).map(card)}
      </Section>
      {data.queued.length ? <Section title="Approved, waiting to be sent">{changeFirst(data.queued, changeId).map(card)}</Section> : null}
      {data.in_progress.length ? <Section title="Waiting for Google">{changeFirst(data.in_progress, changeId).map(card)}</Section> : null}
      {history.length ? (
        <Section title="History">
          {changeFirst(history, changeId).map(card)}
          {cursor ? <Button title="Load more" variant="text" onPress={loadMore} loading={loadingMore} /> : null}
        </Section>
      ) : null}
      <Text style={[font.caption, styles.centerText]}>Editing the profile itself is on the web.</Text>
    </ScrollView>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children: ReactNode[] | ReactNode }) {
  const isEmpty = Array.isArray(children) && children.length === 0;
  return (
    <View style={styles.section}>
      <Text style={font.heading} accessibilityRole="header">
        {title}
      </Text>
      {isEmpty && empty ? <Text style={font.small}>{empty}</Text> : children}
    </View>
  );
}

function ChangeCard({
  change,
  highlighted,
  busy,
  onApprove,
  onDecline,
  onUndo,
}: {
  change: GoogleProfileChange;
  highlighted: boolean;
  busy: string | null;
  onApprove?: () => void;
  onDecline?: () => void;
  onUndo?: () => void;
}) {
  const riskTone = change.risk === 'risky' ? 'danger' : change.risk === 'careful' ? 'warning' : null;
  return (
    <Card style={highlighted ? styles.highlighted : undefined}>
      <View style={styles.top}>
        <Text style={[styles.field, styles.flex]}>{change.field_label}</Text>
        {riskTone ? <Badge label={change.risk === 'risky' ? 'Risky' : 'Check carefully'} tone={riskTone} /> : null}
      </View>
      <Text style={font.caption}>Before</Text>
      <View style={styles.before}>
        <Text style={font.small}>{change.before_text || '—'}</Text>
      </View>
      <Text style={font.caption}>After</Text>
      <View style={styles.after}>
        <Text style={font.body}>{change.after_text || '—'}</Text>
      </View>
      <Text style={font.small}>
        {/* source_label is the API's own words ("One Touch Growth", "You", "Undo"…): shown as it is. */}
        {[change.status_label, change.source_label].filter(Boolean).join(' · ')}
      </Text>
      {change.waiting_reason ? <Text style={font.caption}>{change.waiting_reason}</Text> : null}
      {change.expires_at && change.can.approve ? <Text style={font.caption}>Expires {formatDate(change.expires_at)}</Text> : null}
      {onApprove || onDecline || onUndo ? (
        <View style={styles.actions}>
          {onApprove ? <Button title="Approve" onPress={onApprove} loading={busy === `approve:${change.id}`} disabled={!!busy} style={styles.action} /> : null}
          {onDecline ? (
            <Button title="Decline" variant="secondary" onPress={onDecline} loading={busy === `decline:${change.id}`} disabled={!!busy} style={styles.action} />
          ) : null}
          {onUndo ? <Button title="Undo" variant="secondary" onPress={onUndo} loading={busy === `undo:${change.id}`} disabled={!!busy} style={styles.action} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabs: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  centerText: { textAlign: 'center' },
  section: { gap: spacing.md },
  paused: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSurface, gap: spacing.xs },
  pausedTitle: { fontSize: 15, fontWeight: '600', color: colors.warning },
  highlighted: { borderWidth: 2, borderColor: colors.primary },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  field: { fontSize: 17, fontWeight: '700', color: colors.text },
  before: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.background },
  after: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
});
