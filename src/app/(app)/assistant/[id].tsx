import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ASSISTANT_TEXT_MAX, CORRECTION_MIN, assistantApi } from '@/api/assistant.api';
import type { AssistantMessage } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { can } from '@/config/permissions';
import { colors, font, radius, spacing } from '@/constants/theme';
import { channelLabel, STATE_LABELS } from '@/features/assistant/access';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useAppSelector } from '@/store/hooks';
import { formatDateTime, formatPhone, formatRelative } from '@/utils/format';

/**
 * Screen 15, one assistant conversation. A handed-off conversation is also a chat: replying happens
 * there. Owners and managers can say an answer was wrong (the correction is used from then on).
 */
export default function AssistantConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const role = useAppSelector((s) => s.auth.user?.role);
  const fetcher = useCallback((signal: AbortSignal) => assistantApi.conversation(conversationId, signal), [conversationId]);
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery(`assistant-conversation|${conversationId}`, fetcher);
  const [correcting, setCorrecting] = useState<AssistantMessage | null>(null);
  const [corrected, setCorrected] = useState<number[]>([]);

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;
  const { conversation: c, messages } = data;
  const visitor = c.visitor;
  const canCorrect = can(role, 'managerDashboard');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <Card title={visitor?.name || c.visitor_name || 'Visitor'}>
        <Text style={font.caption}>
          {[c.card?.name, channelLabel(c.channel), formatDateTime(c.started_at)].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.badges}>
          {STATE_LABELS[c.state] ? <Badge label={STATE_LABELS[c.state]} tone={c.handed_off ? 'warning' : 'neutral'} /> : null}
          {c.booking ? <Badge label="Booking request" tone="success" /> : null}
        </View>
        {visitor?.phone ? <Text style={font.body}>{formatPhone(visitor.phone)}</Text> : null}
        {visitor?.email ? <Text style={font.body}>{visitor.email}</Text> : null}
        <View style={styles.actions}>
          {visitor?.phone ? (
            <>
              <Button title="Call" variant="secondary" icon="call-outline" onPress={() => Linking.openURL(`tel:${visitor.phone}`)} style={styles.action} />
              <Button title="Text" variant="secondary" icon="chatbubble-outline" onPress={() => Linking.openURL(`sms:${visitor.phone}`)} style={styles.action} />
            </>
          ) : null}
          {visitor?.email ? (
            <Button title="Email" variant="secondary" icon="mail-outline" onPress={() => Linking.openURL(`mailto:${visitor.email}`)} style={styles.action} />
          ) : null}
        </View>
        {c.chat_id ? (
          <Button
            title="Open the chat to reply"
            icon="chatbubbles-outline"
            onPress={() => router.push({ pathname: '/chats/[id]', params: { id: String(c.chat_id) } })}
          />
        ) : null}
      </Card>

      {messages.map((m) => (
        <Bubble
          key={m.id}
          message={m}
          corrected={corrected.includes(m.id) || !!m.correction}
          onCorrect={canCorrect && m.from === 'assistant' ? () => setCorrecting(m) : undefined}
        />
      ))}

      {correcting ? (
        <CorrectionSheet
          message={correcting}
          onClose={() => setCorrecting(null)}
          onSaved={() => {
            setCorrected((list) => [...list, correcting.id]);
            setCorrecting(null);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function Bubble({ message, corrected, onCorrect }: { message: AssistantMessage; corrected: boolean; onCorrect?: () => void }) {
  if (message.from === 'system') {
    return <Text style={[font.caption, styles.system]}>{message.text}</Text>;
  }
  const visitor = message.from === 'visitor';
  const team = message.from === 'team';
  const who = visitor ? 'Visitor' : team ? message.sender_name || 'Your team' : 'Assistant';
  return (
    <View style={[styles.bubble, visitor ? styles.visitor : team ? styles.team : styles.assistant]}>
      <Text style={team ? styles.teamText : styles.text}>{message.text}</Text>
      <Text style={team ? styles.teamMeta : font.caption}>
        {who} · {formatRelative(message.created_at)}
      </Text>
      {corrected ? <Badge label="Corrected" tone="success" /> : null}
      {onCorrect && !corrected ? <Button title="This answer was wrong" variant="text" onPress={onCorrect} /> : null}
    </View>
  );
}

function CorrectionSheet({ message, onClose, onSaved }: { message: AssistantMessage; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await assistantApi.correct(message.id, text.trim());
      Alert.alert('Saved', 'The assistant will use your answer from now on.');
      onSaved();
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen edges={['top', 'bottom']}>
        <Text style={font.heading}>What should it say?</Text>
        <View style={styles.quote}>
          <Text style={font.small}>{message.text}</Text>
        </View>
        <TextField
          label="The right answer"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={ASSISTANT_TEXT_MAX}
          style={styles.multiline}
          textAlignVertical="top"
          error={error ?? undefined}
        />
        <Button title="Save" onPress={save} loading={busy} disabled={text.trim().length < CORRECTION_MIN} />
        <Button title="Cancel" variant="text" onPress={onClose} />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  system: { textAlign: 'center', marginVertical: spacing.xs },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  visitor: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  assistant: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft },
  team: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  text: { fontSize: 16, color: colors.text },
  teamText: { fontSize: 16, color: colors.onPrimary },
  teamMeta: { fontSize: 12, color: colors.onPrimary },
  quote: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background },
  multiline: { minHeight: 120, paddingTop: spacing.sm },
});
