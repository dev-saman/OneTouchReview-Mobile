import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chips } from '@/components/ui/Chips';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { EmptyState, LoadingView } from '@/components/ui/States';
import { can } from '@/config/permissions';
import { colors, spacing } from '@/constants/theme';
import { useAssistantAvailable } from '@/features/assistant/access';
import { BookingsTab } from '@/features/assistant/BookingsTab';
import { ConversationsTab } from '@/features/assistant/ConversationsTab';
import { TrainTab } from '@/features/assistant/TrainTab';
import { useAppSelector } from '@/store/hooks';

type Tab = 'conversations' | 'bookings' | 'train';

/**
 * Screen 15, Card assistant (Pro: hidden on 403 PLAN_REQUIRED). Tabs: Conversations, Bookings and,
 * for owners and managers, Train. Opened with ?tab= and ?booking= from a push or the bell.
 * Assistant settings are web only.
 */
export default function AssistantScreen() {
  const params = useLocalSearchParams<{ tab?: string; booking?: string }>();
  const role = useAppSelector((s) => s.auth.user?.role);
  const canTrain = can(role, 'managerDashboard');
  const available = useAssistantAvailable();
  const initial: Tab = params.tab === 'bookings' ? 'bookings' : params.tab === 'train' && canTrain ? 'train' : 'conversations';
  const [tab, setTab] = useState<Tab>(initial);

  if (available === null) return <LoadingView />;
  if (!available) {
    return <EmptyState icon="chatbubbles-outline" title="Card assistant isn’t available" message="It isn’t switched on for this account." />;
  }

  const options: { value: Tab; label: string }[] = [
    { value: 'conversations', label: 'Conversations' },
    { value: 'bookings', label: 'Bookings' },
    ...(canTrain ? [{ value: 'train' as const, label: 'Train' }] : []),
  ];
  const bookingId = /^\d+$/.test(params.booking ?? '') ? Number(params.booking) : null;

  return (
    <KeyboardAvoider>
      <View style={styles.screen}>
        <View style={styles.tabs}>
          <Chips options={options} value={tab} onChange={setTab} />
        </View>
        {tab === 'conversations' ? <ConversationsTab /> : tab === 'bookings' ? <BookingsTab highlightId={bookingId} /> : <TrainTab />}
      </View>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabs: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
});
