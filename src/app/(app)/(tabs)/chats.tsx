import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { chatsApi, type ChatAssignedFilter, type ChatStatusFilter } from '@/api/chats.api';
import type { Chat } from '@/api/types';
import { Badge } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { ListFooter } from '@/components/ui/ListFooter';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { assignedName, channelLabel, chatTitle, preview } from '@/features/chats/format';
import { selectSelectedLocation } from '@/features/location/selectors';
import { usePagedList } from '@/hooks/usePagedList';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatRelative } from '@/utils/format';

const STATUS: { value: ChatStatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
];

const ASSIGNED: { value: ChatAssignedFilter; label: string }[] = [
  { value: 'any', label: 'Everyone' },
  { value: 'me', label: 'Mine' },
  { value: 'none', label: 'Unassigned' },
];

/** Screen 6: chat inbox. No realtime yet (docs/API-GAPS.md #2): refreshes on focus and foreground. */
export default function ChatsScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) return <EmptyState title="No chats yet" />;
  return <ChatsInbox location={location} />;
}

function ChatsInbox({ location }: { location: LocationSelection }) {
  const router = useRouter();
  const navigation = useNavigation();
  const [status, setStatus] = useState<ChatStatusFilter>('open');
  const [assigned, setAssigned] = useState<ChatAssignedFilter>('any');

  const load = useCallback(
    async (cursor: string | null, signal?: AbortSignal) => {
      const page = await chatsApi.list({ location, status, assigned, cursor }, signal);
      return { items: page.chats, next: page.next_cursor || null, meta: { unreadTotal: page.unread_total } };
    },
    [location, status, assigned],
  );
  const list = usePagedList<Chat, { unreadTotal: number }, string>(`${location}|${status}|${assigned}`, load);
  useRefreshOnFocus(list.refresh);

  // "Inbox with unread badge": unread_total on the Chats tab.
  const unreadTotal = list.meta?.unreadTotal ?? 0;
  useEffect(() => {
    navigation.setOptions({ tabBarBadge: unreadTotal > 0 ? (unreadTotal > 9 ? '9+' : unreadTotal) : undefined });
  }, [navigation, unreadTotal]);

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <Chips options={STATUS} value={status} onChange={setStatus} />
        <Chips options={ASSIGNED} value={assigned} onChange={setAssigned} />
      </View>
      {list.loading ? (
        <LoadingView />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <Row chat={item} onPress={() => router.push({ pathname: '/chats/[id]', params: { id: String(item.id) } })} />
          )}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={list.items.length ? undefined : styles.empty}
          ListEmptyComponent={
            <EmptyState
              title={status === 'open' ? 'No open chats' : 'No chats'}
              message="Visitors chat with you from your digital card."
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

function Row({ chat, onPress }: { chat: Chat; onPress: () => void }) {
  const unread = chat.unread > 0;
  const assignee = assignedName(chat.assigned_to);
  const meta = [channelLabel(chat.channel), chat.location?.name, assignee ? `Assigned to ${assignee}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${chatTitle(chat)}${unread ? `, ${chat.unread} unread` : ''}. ${preview(chat.last_message)}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <View style={styles.top}>
          <Text style={[styles.name, unread && styles.unreadText]} numberOfLines={1}>
            {chatTitle(chat)}
          </Text>
          <Text style={font.caption}>{formatRelative(chat.last_activity_at ?? chat.created_at)}</Text>
        </View>
        <Text style={[font.small, unread && styles.previewUnread]} numberOfLines={2}>
          {preview(chat.last_message) || 'No messages yet'}
        </Text>
        <View style={styles.metaRow}>
          {chat.status === 'done' ? <Badge label="Done" /> : null}
          {chat.blocked ? <Badge label="Blocked" tone="danger" /> : null}
          {meta ? <Text style={font.caption}>{meta}</Text> : null}
        </View>
      </View>
      {unread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{chat.unread > 9 ? '9+' : chat.unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget + 16,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.background },
  main: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  unreadText: { fontWeight: '800' },
  previewUnread: { color: colors.text, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  empty: { flexGrow: 1 },
});
