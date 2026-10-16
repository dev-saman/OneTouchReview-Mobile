import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { reviewExtrasApi } from '@/api/siteReviews.api';
import type { ReviewsSummary, SummarySource } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { colors, font, spacing } from '@/constants/theme';
import { can } from '@/config/permissions';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatDate } from '@/utils/format';

/**
 * AI summary at the top of Reviews (GET /reviews/summary). Hidden while loading, on any error and
 * when summary is null (not enough reviews, AI off). Owners and managers can make it again now.
 */
export function SummaryCard({ location, source }: { location: LocationSelection; source: SummarySource }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  const fetcher = useCallback((signal: AbortSignal) => reviewExtrasApi.summary(location, source, signal), [location, source]);
  const q = useApiQuery(`reviews-summary|${location}|${source}`, fetcher);
  const [fresh, setFresh] = useState<{ for: unknown; answer: ReviewsSummary } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  // A refreshed answer applies only to the data it replaced.
  const summary = (fresh && fresh.for === q.data ? fresh.answer : q.data)?.summary;
  if (!summary) return null;

  const remake = async () => {
    setBusy(true);
    try {
      setFresh({ for: q.data, answer: await reviewExtrasApi.refreshSummary(location, source) });
    } catch (e) {
      Alert.alert('Couldn’t update the summary', toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="What people say">
      <Text style={font.body} numberOfLines={expanded ? undefined : 3}>
        {summary.text}
      </Text>
      {summary.text.length > 140 ? (
        <Button title={expanded ? 'Show less' : 'Read more'} variant="text" onPress={() => setExpanded((v) => !v)} />
      ) : null}
      {summary.praised.length ? <Line label="Praised" items={summary.praised} tone="success" /> : null}
      {summary.complaints.length ? <Line label="Complaints" items={summary.complaints} tone="warning" /> : null}
      <Text style={font.caption}>
        Based on {summary.based_on.reviews} {summary.based_on.reviews === 1 ? 'review' : 'reviews'}, {formatDate(summary.based_on.from)} –{' '}
        {formatDate(summary.based_on.to)}
      </Text>
      {can(role, 'manageReviews') ? <Button title="Update summary" variant="text" onPress={remake} loading={busy} /> : null}
    </Card>
  );
}

function Line({ label, items, tone }: { label: string; items: string[]; tone: 'success' | 'warning' }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      {items.map((item) => (
        <Badge key={item} label={item} tone={tone} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginRight: spacing.xs },
});
