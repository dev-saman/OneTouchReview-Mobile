import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { reportsApi, type AttributionGroup } from '@/api/reports.api';
import type { AttributionReview } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card, InfoRow } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { Stars } from '@/components/ui/Stars';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { formatDate } from '@/utils/format';

import { confidenceLabel } from './format';

/**
 * Reports → Reviews from your requests (GET /analytics/attribution, last 30 days) and the reviews
 * behind the numbers. The API's note and reasons are shown as they are; the app never says a
 * client "left" a review.
 */
export function AttributionTab({ location }: { location: LocationSelection }) {
  const fetcher = useCallback((signal: AbortSignal) => reportsApi.attribution(location, signal), [location]);
  const q = useApiQuery(`attribution|${location}`, fetcher);
  useRefreshOnFocus(q.refresh);
  const [group, setGroup] = useState<AttributionGroup>('likely');

  if (q.loading) return <LoadingView />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;
  const { period, reviews, activity, weeks, note } = q.data;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} />}
    >
      <Text style={font.caption}>
        {formatDate(period.from)} – {formatDate(period.to)}
      </Text>
      <Card title="New Google reviews">
        {reviews.total === 0 ? (
          <Text style={font.body}>No new Google reviews in this period.</Text>
        ) : (
          <>
            <Text style={styles.big}>
              {reviews.likely.total} of {reviews.total}
            </Text>
            <Text style={font.body}>likely came from your requests or cards.</Text>
          </>
        )}
        {reviews.likely.total ? (
          <Text style={font.small}>
            Very likely {reviews.likely.high} · Likely {reviews.likely.medium} · Possibly {reviews.likely.low}
          </Text>
        ) : null}
        <Text style={font.small}>{reviews.unlinked} not linked to a request or card.</Text>
        <Text style={font.caption}>{note}</Text>
      </Card>

      <Card title="What you sent">
        <InfoRow label="Requests sent" value={String(activity.sent)} />
        <InfoRow label="Delivered" value={String(activity.delivered)} />
        <InfoRow label="Link opened" value={String(activity.clicked)} />
        <InfoRow label="Card scans" value={String(activity.card_scans)} />
        <InfoRow label="Review taps on cards" value={String(activity.card_review_taps)} />
      </Card>

      {weeks.length ? (
        <Card title="By week">
          {weeks.map((w) => (
            <InfoRow key={w.week} label={`Week of ${formatDate(w.week)}`} value={`${w.likely} of ${w.reviews}`} />
          ))}
        </Card>
      ) : null}

      <Card title="The reviews">
        <Chips
          options={[
            { value: 'likely', label: `Likely (${reviews.likely.total})` },
            { value: 'unlinked', label: `Not linked (${reviews.unlinked})` },
          ]}
          value={group}
          onChange={setGroup}
        />
        <ReviewList key={`${location}|${group}`} location={location} group={group} />
      </Card>
    </ScrollView>
  );
}

function ReviewList({ location, group }: { location: LocationSelection; group: AttributionGroup }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => reportsApi.attributionReviews(location, group, null, signal), [location, group]);
  const q = useApiQuery(`attribution-reviews|${location}|${group}`, fetcher);
  const [more, setMore] = useState<{ for: unknown; items: AttributionReview[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  if (q.loading) return <Text style={font.small}>Loading…</Text>;
  if (!q.data) return q.error ? <Text style={styles.error}>{q.error.message}</Text> : null;
  const extra = more && more.for === q.data ? more : null;
  const items = [...q.data.reviews, ...(extra?.items ?? [])];
  const cursor = extra ? extra.cursor : q.data.next_cursor;

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await reportsApi.attributionReviews(location, group, cursor);
      setMore({ for: q.data, items: [...(extra?.items ?? []), ...page.reviews], cursor: page.next_cursor });
    } catch (e) {
      setMoreError(toApiError(e).message);
    } finally {
      setLoadingMore(false);
    }
  };

  if (items.length === 0) return <Text style={font.small}>No reviews here.</Text>;
  return (
    <View>
      {items.map((r) => {
        const confidence = confidenceLabel(r.confidence);
        return (
          <Pressable
            key={r.google_review_id}
            onPress={() => router.push({ pathname: '/reviews/[id]', params: { id: String(r.google_review_id) } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.top}>
              <Text style={[styles.name, styles.flex]}>{r.reviewer_name || 'Google user'}</Text>
              <Stars rating={r.rating} />
            </View>
            {r.reason ? <Text style={font.small}>{r.reason}</Text> : null}
            <View style={styles.meta}>
              {confidence ? <Badge label={confidence} tone={r.confidence === 'high' ? 'success' : 'neutral'} /> : null}
              <Text style={font.caption}>
                {[r.location?.name, formatDate(r.review_time), r.request?.customer ? `Request to ${r.request.customer.name}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {moreError ? <Text style={styles.error}>{moreError}</Text> : null}
      {cursor ? <Button title="Load more" variant="text" onPress={loadMore} loading={loadingMore} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  big: { fontSize: 34, fontWeight: '800', color: colors.primary },
  row: { minHeight: touchTarget, paddingVertical: spacing.sm, gap: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { opacity: 0.6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
});
