import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { reportsApi } from '@/api/reports.api';
import type { OwnerReport, ReportFrequency, ReviewPointStat, Sentiment } from '@/api/types';
import { Badge, Card, InfoRow } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { can } from '@/config/permissions';
import { colors, font, radius, spacing } from '@/constants/theme';
import { selectSelectedLocation } from '@/features/location/selectors';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatDate, formatRating } from '@/utils/format';

type Tab = 'points' | 'insights' | 'report';

/** Screen 12: what people like / don't like, insights, and the weekly report (owners and managers). */
export default function ReportsScreen() {
  const location = useAppSelector(selectSelectedLocation);
  const role = useAppSelector((s) => s.auth.user?.role);
  // The bell's review_point_alert opens this screen with ?point={id}.
  const { point } = useLocalSearchParams<{ point?: string }>();
  const [tab, setTab] = useState<Tab>('points');

  if (location === null) return <EmptyState title="No reports yet" />;
  const tabs: { value: Tab; label: string }[] = [
    { value: 'points', label: 'Likes & dislikes' },
    { value: 'insights', label: 'Insights' },
    ...(can(role, 'ownerReport') ? [{ value: 'report' as const, label: 'Weekly report' }] : []),
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <Chips options={tabs} value={tab} onChange={setTab} />
      </View>
      {tab === 'points' ? (
        <PointsTab location={location} highlight={point ? Number(point) : null} />
      ) : tab === 'insights' ? (
        <InsightsTab location={location} />
      ) : (
        <ReportTab />
      )}
    </View>
  );
}

function PointsTab({ location, highlight }: { location: LocationSelection; highlight: number | null }) {
  const fetcher = useCallback((signal: AbortSignal) => reportsApi.points(location, signal), [location]);
  const q = useApiQuery(`points|${location}`, fetcher);
  useRefreshOnFocus(q.refresh);
  if (q.loading) return <LoadingView />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;

  const { likes, dislikes, coverage } = q.data;
  const visible = (list: ReviewPointStat[]) => list.filter((p) => !p.hidden);
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<Refresh q={q} />}>
      <Text style={font.caption}>
        Last 30 days · {coverage.items} reviews and feedback{coverage.pending ? ` (${coverage.pending} not analysed yet)` : ''}
      </Text>
      <PointList title="What people like" points={visible(likes)} tone="success" highlight={highlight} />
      <PointList title="What people don’t like" points={visible(dislikes)} tone="danger" highlight={highlight} />
    </ScrollView>
  );
}

function PointList({
  title,
  points,
  tone,
  highlight,
}: {
  title: string;
  points: ReviewPointStat[];
  tone: 'success' | 'danger';
  highlight: number | null;
}) {
  return (
    <Card title={title}>
      {points.length === 0 ? <Text style={font.small}>Nothing yet.</Text> : null}
      {points.map((p) => (
        <View key={p.id} style={[styles.point, p.id === highlight && styles.highlight]}>
          <View style={styles.pointTop}>
            <Text style={[font.body, styles.flex]}>{p.name}</Text>
            <Badge label={`${p.mentions} ${p.mentions === 1 ? 'mention' : 'mentions'}`} tone={tone} />
          </View>
          <Text style={font.caption}>
            {[
              p.trend === 'new' ? 'New' : p.change_percent !== null ? `${p.change_percent > 0 ? '+' : ''}${p.change_percent}% vs before` : null,
              p.locations.length > 1 ? p.locations.map((l) => `${l.location_name} ${l.mentions}`).join(', ') : p.locations[0]?.location_name,
              p.last_mentioned_at ? `last ${formatDate(p.last_mentioned_at)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function InsightsTab({ location }: { location: LocationSelection }) {
  const fetcher = useCallback((signal: AbortSignal) => reportsApi.insights(location, signal), [location]);
  const q = useApiQuery(`insights|${location}`, fetcher);
  useRefreshOnFocus(q.refresh);
  if (q.loading) return <LoadingView />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;
  const { period, coverage, sentiment, previous_sentiment: before } = q.data;

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<Refresh q={q} />}>
      <Text style={font.caption}>
        {formatDate(period.from)} – {formatDate(period.to)}, compared with the period before
      </Text>
      <Card title="How reviews feel">
        <SentimentRow label="Positive" now={sentiment} before={before} k="positive" />
        <SentimentRow label="Mixed" now={sentiment} before={before} k="mixed" />
        <SentimentRow label="Neutral" now={sentiment} before={before} k="neutral" />
        <SentimentRow label="Negative" now={sentiment} before={before} k="negative" />
      </Card>
      <Card title="Coverage">
        <InfoRow label="Reviews in this period" value={String(coverage.reviews)} />
        <InfoRow label="Analysed" value={String(coverage.tagged)} />
        {coverage.pending ? <InfoRow label="Waiting to be analysed" value={String(coverage.pending)} /> : null}
      </Card>
    </ScrollView>
  );
}

function SentimentRow({ label, now, before, k }: { label: string; now: Sentiment; before: Sentiment; k: keyof Sentiment }) {
  return <InfoRow label={label} value={`${now[k]} (before: ${before[k]})`} />;
}

function ReportTab() {
  const [frequency, setFrequency] = useState<ReportFrequency>('weekly');
  const fetcher = useCallback((signal: AbortSignal) => reportsApi.ownerReport(frequency, signal), [frequency]);
  const q = useApiQuery(frequency, fetcher);
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<Refresh q={q} />}>
      <Chips
        options={[
          { value: 'weekly', label: 'This week' },
          { value: 'monthly', label: 'This month' },
        ]}
        value={frequency}
        onChange={setFrequency}
      />
      {q.loading ? <LoadingView /> : q.data ? <Report report={q.data} /> : q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null}
    </ScrollView>
  );
}

function Report({ report }: { report: OwnerReport }) {
  const { reviews, requests, private_feedback: feedback, points } = report;
  const pct = (rate: number) => `${Math.round(rate * 100)}%`;
  return (
    <>
      <Text style={font.caption}>
        {formatDate(report.period.from)} – {formatDate(report.period.to)}
      </Text>
      {report.ai_summary ? (
        <Card title="Summary">
          <Text style={font.body}>{report.ai_summary}</Text>
        </Card>
      ) : null}
      <Card title="Google reviews">
        <InfoRow label="New reviews" value={String(reviews.new_count)} />
        {reviews.new_average !== null ? <InfoRow label="Their average" value={`${formatRating(reviews.new_average)} ★`} /> : null}
        <InfoRow label="Rating" value={`${formatRating(reviews.rating_now)} ★ (before: ${formatRating(reviews.rating_before)})`} />
        <InfoRow label="Waiting for a reply" value={String(report.awaiting_reply.count)} />
      </Card>
      <Card title="Review requests">
        <InfoRow label="Sent" value={`${requests.sent} (before: ${requests.previous_sent})`} />
        <InfoRow label="Clicked" value={`${requests.clicked} · ${pct(requests.click_rate)} (before: ${pct(requests.previous_click_rate)})`} />
      </Card>
      <Card title="Private feedback">
        <InfoRow label="Received" value={String(feedback.count)} />
        <InfoRow label="1–3 ★" value={String(feedback.low_count)} />
      </Card>
      {points.getting_worse.length || points.getting_better.length || points.still_strong.length ? (
        <Card title="Trends">
          <TrendLine label="Getting worse" items={points.getting_worse} />
          <TrendLine label="Getting better" items={points.getting_better} />
          <TrendLine label="Still strong" items={points.still_strong} />
        </Card>
      ) : null}
      {report.quiet ? <Text style={[font.small, styles.center]}>A quiet period.</Text> : null}
    </>
  );
}

function TrendLine({ label, items }: { label: string; items: { id: number; name: string }[] }) {
  if (!items.length) return null;
  return <InfoRow label={label} value={items.map((i) => i.name).join(', ')} />;
}

function Refresh({ q }: { q: { refreshing: boolean; refresh: () => void } }) {
  return <RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { padding: spacing.lg, gap: spacing.lg },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  point: { gap: 2, paddingVertical: spacing.xs },
  highlight: { backgroundColor: colors.warningSurface, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  pointTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
