import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BOOKING_MESSAGE_MAX, assistantApi } from '@/api/assistant.api';
import type { AssistantBooking } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { can } from '@/config/permissions';
import { colors, font, spacing } from '@/constants/theme';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useAppSelector } from '@/store/hooks';
import { formatPhone } from '@/utils/format';

import { DAY_TIMES, dayLabel, formatInZone, nextDays, sortBookings, timeLabel, zonedTimeToUtc } from './time';

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' }> = {
  new: { label: 'New', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  suggested: { label: 'Other time suggested', tone: 'neutral' },
  declined: { label: 'Declined', tone: 'danger' },
};

/**
 * Booking requests from the assistant: new first. Owners and managers confirm or suggest another
 * time (we email the visitor); everyone can call, text or email with the phone's own apps.
 */
export function BookingsTab({ highlightId }: { highlightId: number | null }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  const canAnswer = can(role, 'managerDashboard');
  const fetcher = useCallback((signal: AbortSignal) => assistantApi.bookings(undefined, signal), []);
  const q = useApiQuery('assistant-bookings', fetcher);
  useRefreshOnFocus(q.refresh);
  const [changed, setChanged] = useState<Record<number, AssistantBooking>>({});
  const [answering, setAnswering] = useState<{ booking: AssistantBooking; mode: 'confirm' | 'suggest' } | null>(null);

  if (q.loading) return <LoadingView />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;

  const bookings = sortBookings(q.data.map((b) => changed[b.id] ?? b));
  // The one a push or the bell opened goes first.
  const ordered = highlightId ? [...bookings.filter((b) => b.id === highlightId), ...bookings.filter((b) => b.id !== highlightId)] : bookings;

  if (ordered.length === 0) {
    return <EmptyState icon="calendar-outline" title="No booking requests" message="When a visitor asks the assistant to book, it shows here." />;
  }
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} />}
    >
      {ordered.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          highlighted={b.id === highlightId}
          canAnswer={canAnswer}
          onAnswer={(mode) => setAnswering({ booking: b, mode })}
        />
      ))}
      {answering ? (
        <AnswerSheet
          booking={answering.booking}
          mode={answering.mode}
          onClose={() => setAnswering(null)}
          onDone={(updated) => {
            setChanged((c) => ({ ...c, [updated.id]: updated }));
            setAnswering(null);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function BookingCard({
  booking: b,
  highlighted,
  canAnswer,
  onAnswer,
}: {
  booking: AssistantBooking;
  highlighted: boolean;
  canAnswer: boolean;
  onAnswer: (mode: 'confirm' | 'suggest') => void;
}) {
  const router = useRouter();
  const status = STATUS[b.status] ?? { label: b.status, tone: 'neutral' as const };
  const { phone, email, name } = b.visitor;
  return (
    <Card style={highlighted ? styles.highlighted : undefined}>
      <View style={styles.top}>
        <Text style={[font.heading, styles.flex]}>{b.service || 'Booking request'}</Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <Text style={styles.when}>{formatInZone(b.requested_at, b.timezone)}</Text>
      {b.status === 'suggested' && b.suggested_at ? <Text style={font.small}>You suggested {formatInZone(b.suggested_at, b.timezone)}</Text> : null}
      <Text style={font.body}>{name || 'Visitor'}</Text>
      {phone ? <Text style={font.small}>{formatPhone(phone)}</Text> : null}
      {email ? <Text style={font.small}>{email}</Text> : null}
      {b.note ? <Text style={font.small}>“{b.note}”</Text> : null}
      {b.card ? <Text style={font.caption}>From {b.card.name}</Text> : null}
      <View style={styles.actions}>
        {phone ? <Button title="Call" variant="secondary" icon="call-outline" onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.action} /> : null}
        {phone ? <Button title="Text" variant="secondary" icon="chatbubble-outline" onPress={() => Linking.openURL(`sms:${phone}`)} style={styles.action} /> : null}
        {email ? <Button title="Email" variant="secondary" icon="mail-outline" onPress={() => Linking.openURL(`mailto:${email}`)} style={styles.action} /> : null}
      </View>
      <View style={styles.actions}>
        {b.chat_id ? (
          <Button title="Open the chat" variant="text" onPress={() => router.push({ pathname: '/chats/[id]', params: { id: String(b.chat_id) } })} style={styles.action} />
        ) : null}
        {b.conversation_id ? (
          <Button
            title="Conversation"
            variant="text"
            onPress={() => router.push({ pathname: '/assistant/[id]', params: { id: String(b.conversation_id) } })}
            style={styles.action}
          />
        ) : null}
      </View>
      {canAnswer && b.status === 'new' ? (
        <View style={styles.actions}>
          <Button title="Confirm" onPress={() => onAnswer('confirm')} style={styles.action} />
          <Button title="Suggest another time" variant="secondary" onPress={() => onAnswer('suggest')} style={styles.action} />
        </View>
      ) : null}
    </Card>
  );
}

function AnswerSheet({
  booking,
  mode,
  onClose,
  onDone,
}: {
  booking: AssistantBooking;
  mode: 'confirm' | 'suggest';
  onClose: () => void;
  onDone: (booking: AssistantBooking) => void;
}) {
  const days = nextDays(14, booking.timezone);
  const [day, setDay] = useState(days[1] ?? days[0]);
  const [time, setTime] = useState('10:00');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startsAt = mode === 'suggest' ? zonedTimeToUtc(day, time, booking.timezone) : null;
  // When the sheet opened: enough to keep the suggestion in the future.
  const [openedAt] = useState(() => Date.now());
  const inPast = startsAt !== null && Date.parse(startsAt) <= openedAt;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const answer =
        mode === 'confirm'
          ? await assistantApi.confirmBooking(booking.id, message.trim() || undefined)
          : await assistantApi.suggestBooking(booking.id, startsAt!, message.trim() || undefined);
      Alert.alert(mode === 'confirm' ? 'Booking confirmed' : 'Time suggested', answer.emailed ? 'We emailed the visitor.' : undefined);
      onDone(answer.booking);
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen edges={['top', 'bottom']}>
        <Text style={font.heading}>{mode === 'confirm' ? 'Confirm the booking' : 'Suggest another time'}</Text>
        <Text style={font.small}>
          {booking.visitor.name || 'The visitor'} asked for {formatInZone(booking.requested_at, booking.timezone)}. We email them your answer.
        </Text>
        {mode === 'suggest' ? (
          <>
            <Text style={styles.label}>Day</Text>
            <Chips options={days.map((d) => ({ value: d, label: dayLabel(d) }))} value={day} onChange={setDay} />
            <Text style={styles.label}>Time{booking.timezone ? ` (${booking.timezone.replace(/_/g, ' ')})` : ''}</Text>
            <Chips options={DAY_TIMES.map((t) => ({ value: t, label: timeLabel(t) }))} value={time} onChange={setTime} />
            {inPast ? <Text style={styles.error}>Pick a time in the future.</Text> : null}
          </>
        ) : null}
        <TextField
          label="Message (optional)"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={BOOKING_MESSAGE_MAX}
          style={styles.multiline}
          textAlignVertical="top"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={mode === 'confirm' ? 'Confirm' : 'Send suggestion'} onPress={submit} loading={busy} disabled={inPast} />
        <Button title="Cancel" variant="text" onPress={onClose} />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  highlighted: { borderWidth: 2, borderColor: colors.primary },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  when: { fontSize: 16, fontWeight: '600', color: colors.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  multiline: { minHeight: 90, paddingTop: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
});
