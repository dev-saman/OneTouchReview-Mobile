import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AI_DRAFT_STATUS, reviewsApi, waitingDraftText, type ReviewStatus } from '@/api/reviews.api';
import type { GoogleReview, ReviewsPage } from '@/api/types';
import { Badge } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { ListFooter } from '@/components/ui/ListFooter';
import { Stars } from '@/components/ui/Stars';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing } from '@/constants/theme';
import { selectSelectedLocation } from '@/features/location/selectors';
import { changeLabel } from '@/features/reviews/changes';
import { useSiteTabs } from '@/features/reviews/hooks';
import { listStyles, SearchBox, TagFilter } from '@/features/reviews/ListControls';
import { SiteReviewsList } from '@/features/reviews/SiteReviewsList';
import { GOOGLE_TAB, siteTabs } from '@/features/reviews/sites';
import { SummaryCard } from '@/features/reviews/SummaryCard';
import { TagBadges } from '@/features/reviews/TagsCard';
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

/**
 * Screen 4: Reviews. A Google tab plus one tab per connected review site, built from the API
 * (by_profile): a site the server adds later appears by itself. 503 SITE_REVIEWS_OFF: Google only.
 * Opened with ?status= (Google filter) or ?source={platform}&profile_id= (a site's tab).
 */
export default function ReviewsScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) return <EmptyState title="No reviews yet" />;
  return <ReviewsTabs location={location} />;
}

function ReviewsTabs({ location }: { location: LocationSelection }) {
  const params = useLocalSearchParams<{ status?: string; source?: string; profile_id?: string }>();
  const opened = params.source && params.source !== GOOGLE_TAB ? params.source : null;
  const sites = useSiteTabs(location);
  const [tab, setTab] = useState(opened ?? GOOGLE_TAB);

  const tabs = [...sites.tabs];
  // A push can name a site before its tab has loaded.
  if (tab !== GOOGLE_TAB && !tabs.some((t) => t.key === tab)) tabs.push(...siteTabs([{ platform: tab }]));
  const current = tabs.find((t) => t.key === tab);

  return (
    <View style={listStyles.screen}>
      {tabs.length ? (
        <View style={styles.tabs}>
          <Chips options={[{ value: GOOGLE_TAB, label: 'Google' }, ...tabs.map((t) => ({ value: t.key, label: t.label }))]} value={tab} onChange={setTab} />
        </View>
      ) : null}
      {current ? (
        <SiteReviewsList
          key={current.key}
          location={location}
          platform={current.key}
          label={current.label}
          profileId={current.key === opened && /^\d+$/.test(params.profile_id ?? '') ? Number(params.profile_id) : undefined}
          byProfile={sites.byProfile}
        />
      ) : (
        <GoogleReviewsList location={location} status={params.status} />
      )}
    </View>
  );
}

function GoogleReviewsList({ location, status }: { location: LocationSelection; status?: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(filterForParam(status));
  const [tagId, setTagId] = useState<number | null>(null);
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
          tagId: tagId ?? undefined,
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
    [location, filter, tagId, search],
  );
  const list = usePagedList(`${location}|${filter}|${tagId}|${search}`, load);
  useRefreshOnFocus(list.refresh);
  const filtered = filter !== 'all' || tagId !== null || !!search;

  return (
    <View style={listStyles.screen}>
      <View style={listStyles.controls}>
        <SearchBox value={query} onChange={setQuery} />
        <Chips options={FILTERS} value={filter} onChange={setFilter} />
        <TagFilter value={tagId} onChange={setTagId} />
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
          ListHeaderComponent={
            filtered ? null : (
              <View style={listStyles.header}>
                <SummaryCard location={location} source="all" />
              </View>
            )
          }
          renderItem={({ item }) => (
            <Row item={item} onPress={() => router.push({ pathname: '/reviews/[id]', params: { id: String(item.id) } })} />
          )}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={list.items.length ? undefined : listStyles.empty}
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title={
                search || tagId !== null
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
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [listStyles.row, pressed && listStyles.pressed]}>
      <View style={listStyles.rowTop}>
        <Text style={listStyles.name} numberOfLines={1}>
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
      <View style={listStyles.rowMeta}>
        {item.removed_at ? (
          <Badge label="Removed from Google" tone="danger" />
        ) : (
          <Badge label={replied ? 'Replied' : 'No reply yet'} tone={replied ? 'success' : 'warning'} />
        )}
        {hasDraft ? <Badge label="AI draft" /> : null}
        {item.last_change && !item.removed_at ? (
          <Badge label={changeLabel(item.last_change.kind, item.last_change.old_rating, item.last_change.new_rating)} />
        ) : null}
        <TagBadges tags={item.tags} />
        <Text style={font.caption}>{[item.location?.name, formatDate(item.review_time)].filter(Boolean).join(' · ')}</Text>
      </View>
    </Pressable>
  );
}

function Separator() {
  return <View style={listStyles.separator} />;
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  average: { fontSize: 36, fontWeight: '800', color: colors.text },
  summaryText: { flex: 1, gap: 2 },
});
