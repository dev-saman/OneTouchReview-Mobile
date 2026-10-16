import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { assistantApi } from '@/api/assistant.api';
import type { AssistantConversation } from '@/api/types';
import { Badge, Card } from '@/components/ui/Card';
import { ListFooter } from '@/components/ui/ListFooter';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { can } from '@/config/permissions';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagedList } from '@/hooks/usePagedList';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useAppSelector } from '@/store/hooks';
import { formatRelative } from '@/utils/format';

import { channelLabel, STATE_LABELS } from './access';

/** Every conversation the card and website assistant had, newest first (cursor paging). */
export function ConversationsTab() {
  const router = useRouter();
  const role = useAppSelector((s) => s.auth.user?.role);
  const load = useCallback(async (cursor: string | null, signal?: AbortSignal) => {
    const answer = await assistantApi.conversations(cursor, signal);
    return { items: answer.conversations, next: answer.has_more ? answer.next_cursor : null, meta: null };
  }, []);
  const list = usePagedList<AssistantConversation, null, string>('assistant-conversations', load);
  useRefreshOnFocus(list.refresh);

  if (list.loading) return <LoadingView />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={can(role, 'managerDashboard') ? <WeekReport /> : null}
      renderItem={({ item }) => (
        <Row item={item} onPress={() => router.push({ pathname: '/assistant/[id]', params: { id: String(item.id) } })} />
      )}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={list.items.length ? undefined : styles.empty}
      ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="No conversations yet" message="When visitors ask your card assistant something, it shows here." />}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={<ListFooter loadingMore={list.loadingMore} moreError={list.moreError} onRetry={list.loadMore} />}
    />
  );
}

/** Weekly numbers (GET /assistant/report, last week): owners and managers; hidden on any error. */
function WeekReport() {
  const fetcher = useCallback((signal: AbortSignal) => assistantApi.report(undefined, signal), []);
  const { data } = useApiQuery('assistant-report', fetcher);
  if (!data) return null;
  const numbers = [
    { label: 'Conversations', value: data.conversations },
    { label: 'Answered alone', value: data.answered_alone },
    { label: 'Handed to you', value: data.handed_off },
    { label: 'Booking requests', value: data.booking_requests },
  ];
  return (
    <View style={styles.header}>
      <Card title="Last week">
        <View style={styles.grid}>
          {numbers.map((n) => (
            <View key={n.label} style={styles.cell}>
              <Text style={styles.value}>{n.value}</Text>
              <Text style={font.caption}>{n.label}</Text>
            </View>
          ))}
        </View>
        <Text style={font.caption}>
          Helpful {data.thumbs.up} · Not helpful {data.thumbs.down}
          {data.top_topics.length ? ` · Top topics: ${data.top_topics.join(', ')}` : ''}
        </Text>
      </Card>
    </View>
  );
}

function Row({ item, onPress }: { item: AssistantConversation; onPress: () => void }) {
  const meta = [item.card?.name, channelLabel(item.channel), formatRelative(item.last_activity_at ?? item.started_at)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.name}>{item.visitor_name || 'Visitor'}</Text>
      {item.first_question ? (
        <Text style={font.body} numberOfLines={2}>
          {item.first_question}
        </Text>
      ) : null}
      <View style={styles.meta}>
        {item.handed_off ? <Badge label="Handed to the team" tone="warning" /> : null}
        {item.booking ? <Badge label="Booking" tone="success" /> : null}
        {!item.handed_off && STATE_LABELS[item.state] && item.state !== 'answering' ? <Badge label={STATE_LABELS[item.state]} /> : null}
        <Text style={font.caption}>
          {item.messages_count} {item.messages_count === 1 ? 'message' : 'messages'} · {meta}
        </Text>
      </View>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  cell: { flexBasis: '50%', gap: 2 },
  value: { fontSize: 22, fontWeight: '700', color: colors.text },
  row: { minHeight: touchTarget + 16, padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  empty: { flexGrow: 1 },
});
