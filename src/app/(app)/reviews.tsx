import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { AI_DRAFT_STATUS, reviewsApi, waitingDraftText, type ReviewStatus } from '@/api/reviews.api';
import type { GoogleReview, ReviewsPage } from '@/api/types';
import { Badge } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { ListFooter } from '@/components/ui/ListFooter';
import { Stars } from '@/components/ui/Stars';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, radius, spacing, touchTarget } from '@/constants/theme';
import { selectSelectedLocation } from '@/features/location/selectors';
import { changeLabel } from '@/features/reviews/changes';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedList } from '@/hooks/usePagedList';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatDate, formatRating } from '@/utils/format';

type Filter = 'all' | 'no-reply' | 'negative' | 'ai' | 'changed' | 'removed' | '1' | '2' | '3' | '4' | '5';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'no-reply', label: 'Needs a reply' },
  { value: 'negative', label: 'Negative' },
  { value: 'ai', label: 'AI drafts' },
  { value: 'changed', label: 'Changed' },
  { value: 'removed', label: 'Removed from Google' },
  { value: '1', label: '1 ★' },
  { value: '2', label: '2 ★' },
  { value: '3', label: '3 ★' },
  { value: '4', label: '4 ★' },
  { value: '5', label: '5 ★' },
];

function statusFor(filter: Filter): ReviewStatus | undefined {
  if (filter === 'ai') return AI_DRAFT_STATUS;
  if (filter === 'no-reply' || filter === 'negative' || filter === 'changed' || filter === 'removed') return filter;
  return undefined;
}

/** Opened with ?status= from the bell or a push: ai-draft, or changed (a roll-up of changed reviews). */
function filterForParam(status: string | undefined): Filter {
  if (status === AI_DRAFT_STATUS) return 'ai';
  if (status === 'changed') return 'changed';
  return 'all';
}

type Summary = Pick<
  ReviewsPage,
  'filtered_total' | 'need_reply_count' | 'negative_count' | 'ai_drafts' | 'avg_rating' | 'changed_count'
>;

/** Screen 4: Google reviews with filters (rating, AI drafts, search). */
export default function ReviewsScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) return <EmptyState title="No reviews yet" />;
  return <ReviewsList location={location} />;
}

function ReviewsList({ location }: { location: LocationSelection }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const [filter, setFilter] = useState<Filter>(filterForParam(params.status));
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim(), 350);

  const load = useCallback(
    async (page: number | null, signal?: AbortSignal) => {
      const answer = await reviewsApi.list(
        {
          location,
          page: page ?? 1,
          search,
          status: statusFor(filter),
          rating: /^[1-5]$/.test(filter) ? Number(filter) : undefined,
        },
        signal,
      );
      const summary: Summary = {
        filtered_total: answer.filtered_total,
        need_reply_count: answer.need_reply_count,
        negative_count: answer.negative_count,
        ai_drafts: answer.ai_drafts,
        avg_rating: answer.avg_rating,
        changed_count: answer.changed_count,
      };
      return {
        items: answer.reviews,
        next: answer.current_page < answer.last_page ? answer.current_page + 1 : null,
        meta: summary,
      };
    },
    [location, filter, search],
  );
  const list = usePagedList(`${location}|${filter}|${search}`, load);
  useRefreshOnFocus(list.refresh);

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search reviews"
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="Search reviews"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
        <Chips options={FILTERS} value={filter} onChange={setFilter} />
        {list.meta ? <SummaryLine summary={list.meta} /> : null}
      </View>
      {list.loading ? (
        <LoadingView />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => (
            <Row item={item} onPress={() => router.push({ pathname: '/reviews/[id]', params: { id: String(item.id) } })} />
          )}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={list.items.length ? undefined : styles.empty}
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title={
                search
                  ? 'No matches'
                  : filter === 'ai'
                    ? 'No AI drafts waiting'
                    : filter === 'no-reply'
                      ? 'All caught up'
                      : filter === 'negative'
                        ? 'No negative reviews'
                        : filter === 'changed'
                          ? 'No changed reviews'
                          : filter === 'removed'
                            ? 'No removed reviews'
                            : 'No reviews yet'
              }
              message={filter === 'all' && !search ? 'Google reviews for this location appear here.' : undefined}
            />
          }
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          keyboardDismissMode="on-drag"
          ListFooterComponent={<ListFooter loadingMore={list.loadingMore} moreError={list.moreError} onRetry={list.loadMore} />}
        />
      )}
    </View>
  );
}

/** Rating summary from the mockups: average, stars and counts (the API has no per-star breakdown). */
function SummaryLine({ summary }: { summary: Summary }) {
  const notes = [
    summary.need_reply_count ? `${summary.need_reply_count} need a reply` : null,
    summary.negative_count ? `${summary.negative_count} negative` : null,
    summary.ai_drafts ? `${summary.ai_drafts} AI ${summary.ai_drafts === 1 ? 'draft' : 'drafts'} waiting` : null,
    summary.changed_count ? `${summary.changed_count} changed` : null,
  ].filter(Boolean);
  const count = `${summary.filtered_total} ${summary.filtered_total === 1 ? 'review' : 'reviews'}`;
  return (
    <View
      style={styles.summary}
      accessible
      accessibilityLabel={[
        summary.avg_rating ? `${formatRating(summary.avg_rating)} stars on average` : null,
        count,
        ...notes,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      {summary.avg_rating ? <Text style={styles.average}>{summary.avg_rating.toFixed(1)}</Text> : null}
      <View style={styles.summaryText}>
        {summary.avg_rating ? <Stars rating={summary.avg_rating} size={18} /> : null}
        <Text style={font.small}>{count}</Text>
        {notes.length ? <Text style={font.caption}>{notes.join(' · ')}</Text> : null}
      </View>
    </View>
  );
}

function Row({ item, onPress }: { item: GoogleReview; onPress: () => void }) {
  const replied = !!item.reply_comment;
  const hasDraft = !!waitingDraftText(item.ai_reply);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowTop}>
        <Text style={styles.name} numberOfLines={1}>
          {item.reviewer_name || 'Google user'}
        </Text>
        <Stars rating={item.rating} />
      </View>
      {item.comment ? (
        <Text style={font.body} numberOfLines={2}>
          {item.comment}
        </Text>
      ) : (
        <Text style={font.small}>Rating only, no comment.</Text>
      )}
      <View style={styles.rowMeta}>
        {item.removed_at ? (
          <Badge label="Removed from Google" tone="danger" />
        ) : (
          <Badge label={replied ? 'Replied' : 'No reply yet'} tone={replied ? 'success' : 'warning'} />
        )}
        {hasDraft ? <Badge label="AI draft" /> : null}
        {item.last_change && !item.removed_at ? (
          <Badge label={changeLabel(item.last_change.kind, item.last_change.old_rating, item.last_change.new_rating)} />
        ) : null}
        <Text style={font.caption}>{[item.location?.name, formatDate(item.review_time)].filter(Boolean).join(' · ')}</Text>
      </View>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  average: { fontSize: 36, fontWeight: '800', color: colors.text },
  summaryText: { flex: 1, gap: 2 },
  screen: { flex: 1, backgroundColor: colors.background },
  controls: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.sm },
  row: { minHeight: touchTarget + 16, padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  empty: { flexGrow: 1 },
});
