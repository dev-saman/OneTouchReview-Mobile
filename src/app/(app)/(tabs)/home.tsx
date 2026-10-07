import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dashboardApi } from '@/api/dashboard.api';
import { Card, InfoRow } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, radius, spacing } from '@/constants/theme';
import { RequestRow } from '@/features/clients/RequestRow';
import { selectSelectedLocation } from '@/features/location/selectors';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatDate, formatRating } from '@/utils/format';

/** Screen 7: numbers for the chosen location (location switcher in the header). */
export default function HomeScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) {
    return <EmptyState title="No locations yet" message="Add a location on the web to see your numbers here." />;
  }
  return <Dashboard location={location} />;
}

function Dashboard({ location }: { location: LocationSelection }) {
  const router = useRouter();

  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const [dashboard, usage] = await Promise.all([
        dashboardApi.get(location, signal),
        // Usage is a bonus: if it fails, the dashboard still shows.
        dashboardApi.usage(location, signal).catch(() => null),
      ]);
      return { dashboard, usage };
    },
    [location],
  );
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery(location, fetcher);
  useRefreshOnFocus(refresh);

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;

  const { stats, recent_requests: recent, urgent_feedback_7d: urgent } = data.dashboard;
  const usage = data.usage;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      {urgent > 0 ? (
        <View style={styles.urgent} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={styles.urgentText}>
            {urgent} urgent private feedback in the last 7 days
          </Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        <Stat label="Clients" value={String(stats.total_customers)} />
        <Stat label="Requests sent" value={String(stats.total_requests_sent)} />
        <Stat label="Responses" value={String(stats.total_responses)} />
        {/* The API sends 0 when there are no responses yet. */}
        <Stat label="Average rating" value={stats.total_responses > 0 ? formatRating(stats.avg_rating) : '—'} />
        <Stat
          label="Google reviews"
          value={stats.google_connected ? String(stats.google_reviews_count) : '—'}
          note={stats.google_connected ? undefined : 'Not connected'}
        />
        <Stat
          label="Messages this month"
          value={String(stats.current_period_messages_used)}
          note={stats.messages_quota ? `of ${stats.messages_quota}` : undefined}
        />
      </View>

      {usage ? (
        <Card title="Activity">
          <Text style={font.caption}>
            {formatDate(usage.period.from)} – {formatDate(usage.period.to)}, compared with the period before
          </Text>
          <InfoRow label="Requests sent" value={withPrevious(usage.requests.sent, usage.requests.previous_sent)} />
          <InfoRow label="Follow-ups sent" value={String(usage.requests.follow_ups_sent)} />
          <InfoRow
            label="Review page opens"
            value={withPrevious(usage.clicks.page_opens, usage.clicks.previous_page_opens)}
          />
          <InfoRow
            label="New Google reviews"
            value={withPrevious(usage.google_reviews.new, usage.google_reviews.previous_new)}
          />
        </Card>
      ) : null}

      <Card title="Recent requests">
        {recent.length === 0 ? (
          <Text style={font.small}>No review requests yet.</Text>
        ) : (
          recent.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              title={request.customer?.name}
              onPress={
                request.customer
                  ? () => router.push({ pathname: '/client/[id]', params: { id: String(request.customer!.id) } })
                  : undefined
              }
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function withPrevious(current: number, previous: number) {
  return `${current} (before: ${previous})`;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${note ? ` ${note}` : ''}`}>
      <Text style={font.small}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {note ? <Text style={font.caption}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  urgent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSurface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  urgentText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.text },
});
