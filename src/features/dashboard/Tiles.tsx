import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cardsApi } from '@/api/cards.api';
import { dashboardApi } from '@/api/dashboard.api';
import { reportsApi } from '@/api/reports.api';
import type { Dashboard, RatingProjection } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { Stars } from '@/components/ui/Stars';
import { colors, font, radius, spacing } from '@/constants/theme';
import { defaultShareCard, shareableCards } from '@/features/card/shareCard';
import { RequestRow } from '@/features/clients/RequestRow';
import { useSiteTabs } from '@/features/reviews/hooks';
import { platformSummary, siteIcon } from '@/features/reviews/sites';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { LocationSelection } from '@/services/storage/prefsStorage';

import { useTileRefresh } from './refresh';
import { Delta, Tile } from './Tile';

type DashboardProps = { location: LocationSelection; dashboard: Dashboard };

/** Ratings as on Reviews: one decimal ("5.0"), "—" when there is none. */
const rating = (value: number | null | undefined) => (typeof value === 'number' ? value.toFixed(1) : '—');

/** rating_projection for the chosen location, or every location for "All locations". */
const projections = (dashboard: Dashboard, location: LocationSelection): RatingProjection[] => {
  const all = dashboard.rating_projection?.locations ?? [];
  return typeof location === 'number' ? all.filter((p) => p.location_id === location) : all;
};

const nextTarget = (p: RatingProjection) =>
  p.at_top ? 'You’re at the top' : p.targets[0] ? `${p.targets[0].five_star_needed} more 5★ reviews take you to ${p.targets[0].rating.toFixed(1)}` : null;

/** Row 5: Google rating with "N more 5★ reviews take you to X". */
export function RatingTile({ location, dashboard }: DashboardProps) {
  const router = useRouter();
  const list = projections(dashboard, location);
  const open = () => router.push('/reviews');

  if (!dashboard.stats.google_connected || list.length === 0) {
    return (
      <Tile title="Google rating">
        <Text style={font.body}>Connect Google on the web to see your rating.</Text>
      </Tile>
    );
  }
  if (list.length === 1) {
    const p = list[0];
    const target = nextTarget(p);
    return (
      <Tile title="Google rating" onPress={open} hint="Opens your Google reviews">
        <View style={styles.bigRow}>
          <Text style={styles.big}>{rating(p.shown_rating)}</Text>
          <View style={styles.flex}>
            <Stars rating={p.shown_rating} size={18} />
            <Text style={font.small}>
              {p.count} {p.count === 1 ? 'review' : 'reviews'}
            </Text>
          </View>
        </View>
        {target ? <Text style={styles.target}>{target}</Text> : null}
      </Tile>
    );
  }
  return (
    <Tile title="Google rating" onPress={open} hint="Opens your Google reviews">
      {list.map((p) => (
        <View key={p.location_id} style={styles.locationRow}>
          <View style={styles.flex}>
            <Text style={styles.strong}>{p.location_name}</Text>
            {nextTarget(p) ? <Text style={font.caption}>{nextTarget(p)}</Text> : null}
          </View>
          <Text style={styles.strong}>{rating(p.shown_rating)} ★</Text>
          <Text style={font.small}>({p.count})</Text>
        </View>
      ))}
    </Tile>
  );
}

/** Row 6: this month against the month before, and texts used (no prices, no upgrade link). */
export function MonthTile({ location, dashboard }: DashboardProps) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => dashboardApi.usage(location, signal), [location]);
  const q = useApiQuery(`usage|${location}`, fetcher);
  useTileRefresh(q.refresh);
  const usage = q.data;
  const { current_period_messages_used: used, messages_quota: quota } = dashboard.stats;
  if (!usage) return null;

  const numbers = [
    { label: 'Requests sent', value: usage.requests.sent, previous: usage.requests.previous_sent },
    {
      label: 'Link clicks',
      value: usage.clicks.total ?? usage.clicks.page_opens,
      previous: usage.clicks.previous_total ?? usage.clicks.previous_page_opens,
    },
    { label: 'New Google reviews', value: usage.google_reviews.new, previous: usage.google_reviews.previous_new },
    ...(usage.cards ? [{ label: 'Card scans', value: usage.cards.scans, previous: usage.cards.previous_scans }] : []),
  ];

  return (
    <Tile title="This month" onPress={() => router.push('/reports')} hint="Opens Reports">
      <View style={styles.grid}>
        {numbers.map((n) => (
          <View key={n.label} style={styles.cell} accessible accessibilityLabel={`${n.label}: ${n.value}, before ${n.previous}`}>
            <View style={styles.valueRow}>
              <Text style={styles.value}>{n.value}</Text>
              <Delta current={n.value} previous={n.previous} />
            </View>
            <Text style={font.caption}>{n.label}</Text>
          </View>
        ))}
      </View>
      {quota ? (
        <View style={styles.usage} accessible accessibilityLabel={`Texts used ${used} of ${quota}`}>
          <Text style={font.small}>
            Texts used {used} of {quota}
          </Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, (used / quota) * 100)}%` }]} />
          </View>
        </View>
      ) : null}
    </Tile>
  );
}

/** Row 7: one small card per connected site, Google first. Built only from the API. */
export function SitesTile({ location, dashboard }: DashboardProps) {
  const router = useRouter();
  const sites = useSiteTabs(location);
  useTileRefresh(sites.refresh);
  const google = projections(dashboard, location);
  const googleCount = google.length ? google.reduce((n, p) => n + p.count, 0) : dashboard.stats.google_reviews_count;
  const googleRating = google.length === 1 ? google[0].shown_rating : null;

  const items = [
    ...(dashboard.stats.google_connected
      ? [{ key: 'google', label: 'Google', rating: googleRating, count: googleCount }]
      : []),
    ...sites.tabs.map((t) => {
      const s = platformSummary(sites.byProfile, t.key);
      return { key: t.key, label: t.label, rating: s.average, count: s.count };
    }),
  ];
  if (items.length < 2) return null;

  return (
    <Tile title="Your reviews everywhere">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sites}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.key === 'google' ? '/reviews' : { pathname: '/reviews', params: { source: item.key } })}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.rating !== null ? `${rating(item.rating)} stars, ` : ''}${item.count} reviews`}
            style={({ pressed }) => [styles.site, pressed && styles.pressed]}
          >
            <IconTile name={siteIcon(item.key)} size={32} />
            <Text style={styles.strong} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={font.small}>
              {item.rating !== null ? `${rating(item.rating)} ★ · ` : ''}
              {item.count}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Tile>
  );
}

/** Row 9: reviews that likely came from requests or cards. Never says a client left a review. */
export function AttributionTile({ location }: { location: LocationSelection }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => reportsApi.attribution(location, signal), [location]);
  const q = useApiQuery(`attribution|${location}`, fetcher);
  useTileRefresh(q.refresh);
  const reviews = q.data?.reviews;
  if (!reviews || reviews.total === 0) return null;
  return (
    <Tile
      title="Reviews from your requests"
      onPress={() => router.push({ pathname: '/reports', params: { tab: 'attribution' } })}
      hint="Opens Reports"
    >
      <Text style={font.body}>
        {reviews.likely.total} of {reviews.total} new Google reviews likely came from your requests or cards (last 30 days).
      </Text>
    </Tile>
  );
}

/** Row 10: the default share card's last 30 days, and its open suggestions. */
export function CardTile({ location }: { location: LocationSelection }) {
  const router = useRouter();
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const card = defaultShareCard(shareableCards(await cardsApi.list(signal)), location);
      if (!card?.live) return null;
      return { card, stats: await cardsApi.stats(card.id, signal) };
    },
    [location],
  );
  const q = useApiQuery(`card-tile|${location}`, fetcher);
  useTileRefresh(q.refresh);
  if (!q.data) return null;
  const { card, stats } = q.data;
  const taps = Object.values(stats.taps ?? {}).reduce((n, v) => n + (typeof v === 'number' ? v : 0), 0);
  const numbers = [
    { label: 'Views', value: stats.views },
    { label: 'QR scans', value: stats.scans },
    { label: 'Taps', value: taps },
  ];
  return (
    <Tile title="Your card this month" onPress={() => router.push('/card')} hint="Opens My card">
      <View style={styles.grid}>
        {numbers.map((n) => (
          <View key={n.label} style={[styles.cell, styles.third]}>
            <Text style={styles.value}>{n.value}</Text>
            <Text style={font.caption}>{n.label}</Text>
          </View>
        ))}
      </View>
      {card.insight_open ? (
        <Badge label={`${card.insight_open} ${card.insight_open === 1 ? 'suggestion' : 'suggestions'}`} tone="warning" />
      ) : null}
    </Tile>
  );
}

/** Row 11: your rating next to up to three competitors; the chosen location only. Setup is web only. */
export function NearbyTile({ location, dashboard }: DashboardProps) {
  if (typeof location !== 'number') return null;
  const entry = dashboard.competitors?.find((c) => c.location_id === location);
  if (!entry || entry.competitors.length === 0) return null;
  const rows = [{ name: 'You', ...entry.own }, ...entry.competitors.slice(0, 3)];
  return (
    <Tile title="You vs nearby">
      {rows.map((r, i) => (
        <View key={`${r.name}-${i}`} style={styles.locationRow}>
          <Text style={[styles.flex, i === 0 ? styles.strong : font.body]} numberOfLines={1}>
            {r.name}
          </Text>
          <Text style={styles.strong}>{rating(r.rating)} ★</Text>
          <Text style={font.small}>({r.review_count})</Text>
          <Text style={[font.caption, styles.newCount]}>+{r.new_reviews_30d} in 30 days</Text>
        </View>
      ))}
    </Tile>
  );
}

/** Row 12: the last five requests. */
export function RecentTile({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  const recent = dashboard.recent_requests.slice(0, 5);
  return (
    <Tile title="Recent requests">
      {recent.length === 0 ? (
        <Button title="Send your first request" icon="paper-plane-outline" onPress={() => router.navigate('/send')} />
      ) : (
        recent.map((request) => (
          <RequestRow
            key={request.id}
            request={request}
            title={request.customer?.name.split(/\s+/)[0]}
            onPress={
              request.customer
                ? () => router.push({ pathname: '/client/[id]', params: { id: String(request.customer!.id) } })
                : undefined
            }
          />
        ))
      )}
    </Tile>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  big: { fontSize: 40, fontWeight: '800', color: colors.text },
  target: { fontSize: 15, fontWeight: '600', color: colors.primary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  strong: { fontSize: 15, fontWeight: '600', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  cell: { flexBasis: '50%', gap: 2 },
  third: { flexBasis: '33%' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: { fontSize: 22, fontWeight: '700', color: colors.text },
  usage: { gap: spacing.xs },
  bar: { height: 6, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
  sites: { gap: spacing.sm },
  site: {
    width: 120,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.7 },
  newCount: { minWidth: 92, textAlign: 'right' },
});
