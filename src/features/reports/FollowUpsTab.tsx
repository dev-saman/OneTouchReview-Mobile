import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { reportsApi } from '@/api/reports.api';
import { Card, InfoRow } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { formatDate, humanize } from '@/utils/format';

import { channelName, rateLabel, stepName } from './format';

/**
 * Reports → Follow-up results (GET /follow-ups/results, 30 or 90 days). Rates are the API's
 * outcome_rate percents, "–" with fewer than 10 sends. The API's note is shown as it is.
 * Follow-up settings are web only.
 */
export function FollowUpsTab({ location }: { location: LocationSelection }) {
  const [days, setDays] = useState<'30' | '90'>('30');
  const fetcher = useCallback((signal: AbortSignal) => reportsApi.followUps(location, days === '90' ? 90 : 30, signal), [location, days]);
  const q = useApiQuery(`follow-ups|${location}|${days}`, fetcher);
  useRefreshOnFocus(q.refresh);

  const content = () => {
    if (q.loading) return <LoadingView />;
    if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;
    const r = q.data;
    return (
      <>
        <Text style={font.caption}>
          {formatDate(r.period.from)} – {formatDate(r.period.to)}
        </Text>
        <Card title="Overall">
          <View style={styles.big}>
            <Text style={styles.rate}>{rateLabel(r.totals.outcome_rate)}</Text>
            <Text style={[font.small, styles.flex]}>Outcome rate</Text>
          </View>
          <InfoRow label="First messages" value={String(r.totals.first_messages)} />
          <InfoRow label="Follow-ups sent" value={String(r.totals.follow_ups_sent)} />
          <InfoRow label="Opened" value={String(r.totals.opened)} />
          <InfoRow label="Tapped" value={String(r.totals.tapped)} />
          <InfoRow label="New Google reviews" value={String(r.new_google_reviews)} />
        </Card>
        {Object.keys(r.by_channel).length ? (
          <Card title="By channel">
            {Object.entries(r.by_channel).map(([channel, c]) => (
              <InfoRow key={channel} label={`${channelName(channel)} · ${c.sent} sent`} value={rateLabel(c.outcome_rate)} />
            ))}
          </Card>
        ) : null}
        {r.by_step.length ? (
          <Card title="By step">
            {r.by_step.map((s) => (
              <InfoRow key={`${s.step}-${s.channel}`} label={`${stepName(s.step)} (${channelName(s.channel)}) · ${s.sent} sent`} value={rateLabel(s.outcome_rate)} />
            ))}
          </Card>
        ) : null}
        {r.by_wording.length ? (
          <Card title="By wording">
            {r.by_wording.map((w) => (
              <InfoRow key={w.template_id} label={`${w.name} (${channelName(w.channel)}) · ${w.sent} sent`} value={rateLabel(w.outcome_rate)} />
            ))}
          </Card>
        ) : null}
        {r.by_hour.length ? (
          <Card title="By time of day">
            {r.by_hour.map((h) => (
              <InfoRow key={h.slot} label={`${humanize(h.slot)} · ${h.sent} sent`} value={rateLabel(h.outcome_rate)} />
            ))}
          </Card>
        ) : null}
        <Text style={font.caption}>{r.note}</Text>
        <Text style={font.caption}>Change follow-up settings on the web.</Text>
      </>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} />}
    >
      <Chips
        options={[
          { value: '30', label: 'Last 30 days' },
          { value: '90', label: 'Last 90 days' },
        ]}
        value={days}
        onChange={setDays}
      />
      {content()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  big: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rate: { fontSize: 34, fontWeight: '800', color: colors.primary },
  flex: { flex: 1 },
});
