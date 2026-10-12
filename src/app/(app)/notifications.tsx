import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { notificationsApi } from '@/api/notifications.api';
import { AI_DRAFT_STATUS } from '@/api/reviews.api';
import type { AppNotification } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { IconTile, type IconName, type TileTone } from '@/components/ui/IconTile';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { selectSelectedLocation } from '@/features/location/selectors';
import { useNotificationBadge } from '@/features/notifications/BadgeProvider';
import { notificationTarget } from '@/features/notifications/target';
import { useNotificationsList } from '@/features/notifications/useNotificationsList';
import { toApiError } from '@/hooks/useApiQuery';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { openWebApp } from '@/services/web/openWebApp';
import { formatRelative } from '@/utils/format';

const WEB_MESSAGE = 'Open OneTouchReview on the web to fix this.';

/** One icon per notification kind (Notifications tab); urgent / warning / info set the colour. */
const KIND_ICONS: Record<string, IconName> = {
  private_feedback: 'chatbox-ellipses-outline',
  google_review: 'star-outline',
  ai_drafts: 'sparkles-outline',
  review_point_alert: 'trending-up-outline',
  google_connection: 'logo-google',
  integration: 'link-outline',
  sms_registration: 'chatbubble-outline',
  texts_low: 'speedometer-outline',
  not_sent: 'alert-circle-outline',
};

/** Screen 13: the bell list — last 30 days, newest first. */
export default function NotificationsScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) return <EmptyState title="You're all caught up" />;
  return <NotificationsList location={location} />;
}

function NotificationsList({ location }: { location: LocationSelection }) {
  const router = useRouter();
  const badge = useNotificationBadge();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const list = useNotificationsList(location, filter === 'unread');
  const [markingAll, setMarkingAll] = useState(false);
  const hasUnread = list.items.some((n) => !n.read_at);

  const open = async (n: AppNotification) => {
    // Tap marks read first (safe to call twice), then opens the item.
    if (!n.read_at) {
      list.markReadLocally([n.id]);
      notificationsApi
        .markRead(n.id, location)
        .then((answer) => badge.setCount(answer.unread_count))
        .catch(() => badge.refresh());
    }

    const target = notificationTarget(n);
    switch (target.type) {
      case 'feedback':
        router.push({ pathname: '/feedback/[id]', params: { id: String(target.id), source: target.source } });
        return;
      case 'feedbackList':
        router.push('/feedback');
        return;
      case 'review':
        router.push({ pathname: '/reviews/[id]', params: { id: String(target.id) } });
        return;
      case 'reviewsAiDrafts':
        router.push({ pathname: '/reviews', params: { status: AI_DRAFT_STATUS } });
        return;
      case 'reviewsList':
        router.push('/reviews');
        return;
      case 'reports':
        router.push({ pathname: '/reports', params: target.pointId ? { point: String(target.pointId) } : {} });
        return;
      case 'clientsNotSent':
        router.navigate({ pathname: '/clients', params: { filter: 'not_sent' } });
        return;
      case 'webOnly':
        Alert.alert(n.title, [n.body, WEB_MESSAGE].filter(Boolean).join('\n\n'), [
          { text: 'Close', style: 'cancel' },
          { text: 'Open on the web', onPress: () => openWebApp() },
        ]);
        return;
      case 'messageOnly':
        // texts_low: never a link to billing or plans.
        Alert.alert(n.title, n.body ?? undefined);
        return;
      case 'notInAppYet':
        Alert.alert(n.title, [n.body, `${target.feature} isn’t in this version of the app yet.`].filter(Boolean).join('\n\n'));
        return;
      default:
        Alert.alert(n.title, n.body ?? undefined);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      const unread = await notificationsApi.markAllRead(location);
      list.markReadLocally(list.items.filter((n) => !n.read_at).map((n) => n.id));
      badge.setCount(unread);
    } catch (e) {
      Alert.alert('Couldn’t mark all as read', toApiError(e).message);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            hasUnread ? (
              <Button title="Mark all as read" variant="text" onPress={markAll} loading={markingAll} style={styles.markAll} />
            ) : null,
        }}
      />
      <View style={styles.controls}>
        <Chips
          options={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      {list.loading ? (
        <LoadingView />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(n) => String(n.id)}
          renderItem={({ item }) => <Row item={item} onPress={() => open(item)} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={list.items.length ? undefined : styles.emptyContainer}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="You're all caught up"
              message={filter === 'unread' ? 'No unread notifications.' : 'Nothing needs your attention right now.'}
            />
          }
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            list.loadingMore ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : list.moreError ? (
              <View style={styles.footer}>
                <Text style={[font.small, styles.center]}>{list.moreError.message}</Text>
                <Button title="Load more" variant="text" onPress={list.loadMore} />
              </View>
            ) : null
          }
        />
      )}
    </>
  );
}

function Row({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const unread = !item.read_at;
  const tone: TileTone = item.severity === 'urgent' ? 'danger' : item.severity === 'warning' ? 'accent' : 'brand';
  const meta = [item.location?.name, formatRelative(item.updated_at || item.created_at)].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.severity === 'urgent' ? 'Urgent. ' : ''}${item.title}. ${meta}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconTile name={KIND_ICONS[item.kind] ?? 'notifications-outline'} tone={tone} size={40} />
      <View style={styles.main}>
        <Text style={[styles.title, unread && styles.titleUnread]}>{item.title}</Text>
        {item.body ? <Text style={font.small}>{item.body}</Text> : null}
        {meta ? <Text style={font.caption}>{meta}</Text> : null}
      </View>
      {unread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  markAll: { minHeight: touchTarget, paddingHorizontal: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget + 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.background },
  main: { flex: 1, gap: 2 },
  title: { fontSize: 16, color: colors.text },
  titleUnread: { fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg + 40 + spacing.md },
  controls: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  emptyContainer: { flexGrow: 1 },
  footer: { padding: spacing.lg, gap: spacing.sm },
  center: { textAlign: 'center' },
});
