import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { assistantApi } from '@/api/assistant.api';
import { chatsApi } from '@/api/chats.api';
import { AI_DRAFT_STATUS, reviewsApi } from '@/api/reviews.api';
import type { Dashboard } from '@/api/types';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { can } from '@/config/permissions';
import { openTarget } from '@/features/notifications/openTarget';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useAppForeground } from '@/hooks/useAppForeground';
import { onPushReceived } from '@/services/push/push';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';

import { needsYouRows, type NeedsCounts, type NeedsKey } from './needsYou';
import { useTileRefresh } from './refresh';
import { Tile } from './Tile';

/**
 * Dashboard tab row 4, "Needs you": one line per thing that isn't zero, most urgent first. Each
 * source fails on its own (403 PLAN_REQUIRED or role: that row hides). Refreshed when the app
 * comes to the foreground and after a push.
 */
export function NeedsYouTile({ location, dashboard }: { location: LocationSelection; dashboard: Dashboard | null }) {
  const router = useRouter();
  const role = useAppSelector((s) => s.auth.user?.role);
  const isManager = can(role, 'managerDashboard');

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<Partial<NeedsCounts>> => {
      const [reviews, chats, bookings, training] = await Promise.all([
        reviewsApi.list({ location, status: 'no-reply', page: 1, perPage: 1 }, signal).catch(() => null),
        chatsApi.list({ location, status: 'all', assigned: 'any' }, signal).catch(() => null),
        assistantApi.bookings('new', signal).catch(() => null),
        isManager ? assistantApi.training(signal).catch(() => null) : Promise.resolve(null),
      ]);
      return {
        needReply: reviews?.need_reply_count,
        aiDrafts: reviews?.ai_drafts,
        unreadChats: chats?.unread_total,
        bookings: bookings?.length,
        training: training?.questions.length,
      };
    },
    [location, isManager],
  );
  const q = useApiQuery(`needs-you|${location}|${isManager}`, fetcher);
  const { refresh } = q;
  useTileRefresh(refresh);
  useAppForeground(refresh);
  useEffect(() => onPushReceived(() => void refresh()), [refresh]);

  if (!dashboard && !q.data) return null;
  const counts: Partial<NeedsCounts> = {
    ...q.data,
    urgentFeedback: dashboard?.urgent_feedback_7d,
    profileChanges: dashboard?.google_profile?.reduce((n, p) => n + (p.changes_waiting ?? 0), 0),
    shieldOpen: dashboard?.review_shield?.open,
  };
  const rows = needsYouRows(counts, isManager);

  const open = (key: NeedsKey, label: string) => {
    const text = { title: label, body: null };
    switch (key) {
      case 'urgentFeedback':
        return router.push({ pathname: '/feedback', params: { filter: 'urgent' } });
      case 'needReply':
        return router.push({ pathname: '/reviews', params: { status: 'no-reply' } });
      case 'aiDrafts':
        return router.push({ pathname: '/reviews', params: { status: AI_DRAFT_STATUS } });
      case 'unreadChats':
        return router.navigate('/chats');
      case 'bookings':
        return openTarget(router, { type: 'assistant', tab: 'bookings', bookingId: null }, text);
      case 'profileChanges':
        return openTarget(router, { type: 'googleProfile', locationId: typeof location === 'number' ? location : null, changeId: null }, text);
      case 'shieldOpen':
        // Review Shield actions are on the web; the app shows the reviews.
        return router.push('/reviews');
      case 'training':
        return openTarget(router, { type: 'assistant', tab: 'train', bookingId: null }, text);
    }
  };

  return (
    <Tile title="Needs you">
      {rows.length === 0 ? (
        <View style={styles.caughtUp}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={font.body}>You’re all caught up</Text>
        </View>
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.key}
            onPress={() => open(row.key, row.label)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={[font.body, styles.flex, row.key === 'urgentFeedback' && styles.urgent]}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))
      )}
    </Tile>
  );
}

const styles = StyleSheet.create({
  caughtUp: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  flex: { flex: 1 },
  urgent: { color: colors.danger, fontWeight: '600' },
});
