import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { feedbackApi, type FeedbackFilter } from '@/api/feedback.api';
import type { PrivateFeedback } from '@/api/types';
import { Badge } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { ListFooter } from '@/components/ui/ListFooter';
import { Stars } from '@/components/ui/Stars';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { selectSelectedLocation } from '@/features/location/selectors';
import { usePagedList } from '@/hooks/usePagedList';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatRelative } from '@/utils/format';

const FILTERS: { value: FeedbackFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'low', label: '1–3 ★' },
];

/** Request feedback and card feedback are separate records: their ids can repeat. */
const feedbackKey = (f: PrivateFeedback) => `${f.source}-${f.id}`;

/** Screen 5: private feedback inbox, urgent first (the API's default order). */
export default function FeedbackScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) return <EmptyState title="No feedback yet" />;
  return <FeedbackList location={location} />;
}

function FeedbackList({ location }: { location: LocationSelection }) {
  const router = useRouter();
  // The dashboard's urgent banner opens this screen with ?filter=urgent.
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<FeedbackFilter>(params.filter === 'urgent' ? 'urgent' : 'all');

  const load = useCallback(
    async (page: number | null, signal?: AbortSignal) => {
      const answer = await feedbackApi.list(location, filter, page ?? 1, signal);
      return { items: answer.feedback, next: answer.has_more ? answer.page + 1 : null, meta: null };
    },
    [location, filter],
  );
  const list = usePagedList(`${location}|${filter}`, load, feedbackKey);
  useRefreshOnFocus(list.refresh);

  const openItem = (f: PrivateFeedback) =>
    router.push({ pathname: '/feedback/[id]', params: { id: String(f.id), source: f.source === 'card' ? 'card' : 'request' } });

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <Chips options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {list.loading ? (
        <LoadingView />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={feedbackKey}
          renderItem={({ item }) => <Row item={item} onPress={() => openItem(item)} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={list.items.length ? undefined : styles.empty}
          ListEmptyComponent={
            <EmptyState
              title={filter === 'urgent' ? 'Nothing urgent' : 'No feedback yet'}
              message="Private feedback from clients appears here."
            />
          }
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={<ListFooter loadingMore={list.loadingMore} moreError={list.moreError} onRetry={list.loadMore} />}
        />
      )}
    </View>
  );
}

function Row({ item, onPress }: { item: PrivateFeedback; onPress: () => void }) {
  const meta = [item.location?.name, formatRelative(item.created_at)].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowTop}>
        <Text style={styles.name} numberOfLines={1}>
          {item.client?.name || 'A client'}
        </Text>
        <Stars rating={item.rating} />
      </View>
      {item.text ? (
        <Text style={font.body} numberOfLines={2}>
          {item.text}
        </Text>
      ) : null}
      <View style={styles.rowMeta}>
        {item.source === 'card' ? <Badge label="Card" /> : null}
        {meta ? <Text style={font.caption}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { minHeight: touchTarget + 16, padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  empty: { flexGrow: 1 },
});
