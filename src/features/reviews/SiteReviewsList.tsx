import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { siteReviewsApi } from '@/api/siteReviews.api';
import type { SiteProfileSummary, SiteReview } from '@/api/types';
import { Badge } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { ListFooter } from '@/components/ui/ListFooter';
import { Stars } from '@/components/ui/Stars';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedList } from '@/hooks/usePagedList';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { formatDate } from '@/utils/format';

import { listStyles, SearchBox, TagFilter } from './ListControls';
import { platformSummary } from './sites';
import { SummaryCard } from './SummaryCard';
import { TagBadges } from './TagsCard';

type Rating = 'all' | '1' | '2' | '3' | '4' | '5';

const RATINGS: { value: Rating; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '5', label: '5 ★' },
  { value: '4', label: '4 ★' },
  { value: '3', label: '3 ★' },
  { value: '2', label: '2 ★' },
  { value: '1', label: '1 ★' },
];

/** "Recommends" / "Doesn't recommend" on recommend-only sites (rating null). */
export function recommendLabel(recommends: boolean | null): string | null {
  if (recommends === true) return 'Recommends';
  if (recommends === false) return 'Doesn’t recommend';
  return null;
}

/** One review site's tab (GET /site-reviews?platform=…), newest first. */
export function SiteReviewsList({
  location,
  platform,
  label,
  profileId,
  byProfile,
}: {
  location: LocationSelection;
  platform: string;
  label: string;
  /** From a push or bell item: one profile of this site. */
  profileId?: number;
  byProfile: SiteProfileSummary[];
}) {
  const router = useRouter();
  const [rating, setRating] = useState<Rating>('all');
  const [tagId, setTagId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim(), 350);

  const load = useCallback(
    async (page: number | null, signal?: AbortSignal) => {
      const answer = await siteReviewsApi.list(
        {
          location,
          platform,
          profileId,
          page: page ?? 1,
          search,
          tagId: tagId ?? undefined,
          rating: rating === 'all' ? undefined : Number(rating),
        },
        signal,
      );
      return {
        items: answer.reviews,
        next: answer.current_page < answer.last_page ? answer.current_page + 1 : null,
        meta: answer.total,
      };
    },
    [location, platform, profileId, search, tagId, rating],
  );
  const list = usePagedList(`${location}|${platform}|${profileId}|${rating}|${tagId}|${search}`, load);
  useRefreshOnFocus(list.refresh);
  const summary = platformSummary(byProfile, platform);
  const filtered = rating !== 'all' || tagId !== null || !!search;

  return (
    <View style={listStyles.screen}>
      <View style={listStyles.controls}>
        <SearchBox value={query} onChange={setQuery} />
        <Chips options={RATINGS} value={rating} onChange={setRating} />
        <TagFilter value={tagId} onChange={setTagId} />
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
            <View style={listStyles.header}>
              <SiteSummary label={label} {...summary} />
              {filtered ? null : <SummaryCard location={location} source="all" />}
            </View>
          }
          renderItem={({ item }) => (
            <SiteRow item={item} onPress={() => router.push({ pathname: '/site-reviews/[id]', params: { id: String(item.id) } })} />
          )}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={list.items.length ? undefined : listStyles.empty}
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title={filtered ? 'No matches' : `No ${label} reviews yet`}
              message={summary.importing ? 'Reviews are still being imported.' : undefined}
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

function SiteSummary({ label, count, average, importing, notes }: { label: string } & ReturnType<typeof platformSummary>) {
  return (
    <View style={styles.summary} accessible>
      {average !== null ? <Text style={styles.average}>{average.toFixed(1)}</Text> : null}
      <View style={styles.summaryText}>
        {average !== null ? <Stars rating={average} size={18} /> : null}
        <Text style={font.small}>
          {count} {count === 1 ? 'review' : 'reviews'} on {label}
        </Text>
        {importing ? <Text style={font.caption}>Importing reviews…</Text> : null}
        {notes.map((note) => (
          <Text key={note} style={font.caption}>
            {note}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SiteRow({ item, onPress }: { item: SiteReview; onPress: () => void }) {
  const recommend = recommendLabel(item.recommends);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [listStyles.row, pressed && listStyles.pressed]}>
      <View style={listStyles.rowTop}>
        <Text style={listStyles.name} numberOfLines={1}>
          {item.reviewer_first_name || `${item.platform_name} reviewer`}
        </Text>
        {item.rating !== null ? <Stars rating={item.rating} /> : recommend ? <Text style={font.small}>{recommend}</Text> : null}
      </View>
      {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
      {item.body ? (
        <Text style={font.body} numberOfLines={2}>
          {item.body}
        </Text>
      ) : null}
      <View style={listStyles.rowMeta}>
        {item.owner_response ? <Badge label="Replied" tone="success" /> : null}
        <TagBadges tags={item.tags} />
        <Text style={font.caption}>{[item.location?.name, formatDate(item.posted_on)].filter(Boolean).join(' · ')}</Text>
      </View>
    </Pressable>
  );
}

function Separator() {
  return <View style={listStyles.separator} />;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  average: { fontSize: 36, fontWeight: '800', color: colors.text },
  summaryText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
});
