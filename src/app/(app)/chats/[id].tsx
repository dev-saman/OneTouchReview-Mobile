import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHAT_MESSAGE_MAX, chatsApi } from '@/api/chats.api';
import type { Chat, ChatMessage } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Badge } from '@/components/ui/Card';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, radius, spacing, touchTarget } from '@/constants/theme';
import { AssignSheet } from '@/features/chats/AssignSheet';
import { assignedName, channelLabel, chatTitle, deliveryLabel, textOrNull } from '@/features/chats/format';
import { useOutbox, type OutgoingMessage } from '@/features/chats/useOutbox';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { formatDateTime, formatRelative, isFuture } from '@/utils/format';

/** Screen 6 detail (push deep link /chats/{id}): messages, reply, mark done / reopen. */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);

  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const [answer, quickReplies] = await Promise.all([
        chatsApi.get(chatId, signal),
        chatsApi.quickReplies(signal).catch(() => [] as string[]),
      ]);
      return { ...answer, quickReplies };
    },
    [chatId],
  );
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery(chatId, fetcher);
  useRefreshOnFocus(refresh);

  // Replies sent from this screen, until the next load includes them; plus status changes.
  const [sent, setSent] = useState<ChatMessage[]>([]);
  const [chatChange, setChatChange] = useState<Partial<Chat>>({});
  const [shownFor, setShownFor] = useState(data);
  if (shownFor !== data) {
    setShownFor(data);
    setSent([]);
    setChatChange({});
  }

  const onSent = useCallback((message: ChatMessage) => setSent((s) => [...s, message]), []);
  const { outbox, send, retry, discard } = useOutbox(chatId, onSent);

  // Opening the chat marks it read.
  const unread = data?.chat.unread ?? 0;
  useEffect(() => {
    if (unread > 0) chatsApi.markRead(chatId).catch(() => {});
  }, [chatId, unread]);

  // A refused send (e.g. 409 CHAT_BLOCKED) can mean the chat changed: reload it.
  const lastFailure = outbox.find((m) => m.state === 'failed' && m.error?.code === 'CHAT_BLOCKED');
  useEffect(() => {
    if (lastFailure) refresh();
  }, [lastFailure, refresh]);

  const [statusBusy, setStatusBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;

  const chat: Chat = { ...data.chat, ...chatChange };
  const known = new Set(data.messages.map((m) => m.id));
  const messages = [...data.messages, ...sent.filter((m) => !known.has(m.id))].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const toggleStatus = async () => {
    setStatusBusy(true);
    try {
      const updated = await chatsApi.setStatus(chat.id, chat.status === 'done' ? 'open' : 'done');
      setChatChange((change) => ({ ...change, status: updated.status }));
    } catch (e) {
      Alert.alert('Couldn’t update the chat', toApiError(e).message);
    } finally {
      setStatusBusy(false);
    }
  };

  const assign = async (userId: number | null) => {
    setAssigning(false);
    if (userId === (chat.assigned_to?.id ?? null)) return;
    setAssignBusy(true);
    try {
      const updated = await chatsApi.assign(chat.id, userId);
      setChatChange((change) => ({ ...change, assigned_to: updated.assigned_to }));
    } catch (e) {
      Alert.alert('Couldn’t assign the chat', toApiError(e).message);
    } finally {
      setAssignBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: chatTitle(chat),
          headerTitle: () => <ChatHeaderTitle chat={chat} />,
          headerRight: () => (
            <Button
              title={chat.status === 'done' ? 'Reopen' : 'Mark done'}
              variant="text"
              onPress={toggleStatus}
              loading={statusBusy}
              style={styles.headerButton}
            />
          ),
        }}
      />
      <KeyboardAvoider>
        <AssignBar chat={chat} busy={assignBusy} onPress={() => setAssigning(true)} />
        <AssignSheet
          visible={assigning}
          currentId={chat.assigned_to?.id ?? null}
          onPick={assign}
          onClose={() => setAssigning(false)}
        />
        <Messages
          chat={chat}
          messages={messages}
          outbox={outbox}
          onRetry={retry}
          onDiscard={discard}
          refreshing={refreshing}
          onRefresh={refresh}
        />
        <Composer chat={chat} quickReplies={data.quickReplies} onSend={send} />
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

/** Avatar, name and channel / location in the header, as in the mockups. */
function ChatHeaderTitle({ chat }: { chat: Chat }) {
  const sub = [channelLabel(chat.channel), chat.location?.name].filter(Boolean).join(' · ');
  return (
    <View style={styles.headerTitle}>
      <Avatar name={chatTitle(chat)} size={34} />
      <View style={styles.headerText}>
        <Text style={styles.headerName} numberOfLines={1} accessibilityRole="header">
          {chatTitle(chat)}
        </Text>
        {sub ? (
          <Text style={font.caption} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Who the chat is assigned to; tap to change. */
function AssignBar({ chat, busy, onPress }: { chat: Chat; busy: boolean; onPress: () => void }) {
  const assignee = assignedName(chat.assigned_to);
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={assignee ? `Assigned to ${assignee}. Change` : 'Not assigned. Assign'}
      style={({ pressed }) => [styles.assignBar, pressed && styles.assignPressed]}
    >
      <Ionicons name={assignee ? 'person-circle-outline' : 'person-add-outline'} size={20} color={colors.primary} />
      <Text style={[font.small, styles.assignText]} numberOfLines={1}>
        {assignee ? `Assigned to ${assignee}` : 'Not assigned'}
      </Text>
      {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.assignAction}>{assignee ? 'Change' : 'Assign'}</Text>}
    </Pressable>
  );
}

function Messages({
  chat,
  messages,
  outbox,
  onRetry,
  onDiscard,
  refreshing,
  onRefresh,
}: {
  chat: Chat;
  messages: ChatMessage[];
  outbox: OutgoingMessage[];
  onRetry: (clientId: string) => void;
  onDiscard: (clientId: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const info = [channelLabel(chat.channel), chat.location?.name].filter(Boolean).join(' · ');

  return (
    <ScrollView
      ref={scroll}
      style={styles.flex}
      contentContainerStyle={styles.messages}
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.info}>
        {info ? <Text style={[font.caption, styles.center]}>{info}</Text> : null}
        <View style={styles.badges}>
          {chat.status === 'done' ? <Badge label="Done" /> : null}
          {chat.blocked ? <Badge label="Blocked" tone="danger" /> : null}
        </View>
      </View>
      {messages.length === 0 && outbox.length === 0 ? <Text style={[font.small, styles.center]}>No messages yet.</Text> : null}
      {messages.map((m) => (
        <Bubble key={m.id} message={m} />
      ))}
      {outbox.map((m) => (
        <Pressable
          key={m.clientId}
          onPress={m.state === 'failed' ? () => onRetry(m.clientId) : undefined}
          onLongPress={m.state === 'failed' ? () => onDiscard(m.clientId) : undefined}
          accessibilityRole={m.state === 'failed' ? 'button' : undefined}
          accessibilityHint={m.state === 'failed' ? 'Sends it again. Long press to discard.' : undefined}
          style={[styles.bubble, styles.ours, m.state === 'failed' && styles.failed]}
        >
          <Text style={styles.oursText}>{m.body}</Text>
          <Text style={styles.oursMeta}>
            {m.state === 'sending' ? 'Sending…' : `Not sent – tap to retry. ${m.error?.message ?? ''}`}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const ours = message.from === 'business';
  const delivery = deliveryLabel(message);
  const hold = textOrNull(message.hold_reason);
  const meta = [ours ? message.sender_name : null, formatRelative(message.created_at), delivery].filter(Boolean).join(' · ');
  const attachments =
    message.media_count > 0 ? `${message.media_count} attachment${message.media_count === 1 ? '' : 's'} (open on the web)` : null;

  return (
    <View style={[styles.bubble, ours ? styles.ours : styles.theirs]}>
      {message.body ? <Text style={ours ? styles.oursText : styles.theirsText}>{message.body}</Text> : null}
      {attachments ? <Text style={ours ? styles.oursMeta : font.caption}>{attachments}</Text> : null}
      {hold ? <Text style={ours ? styles.oursMeta : font.caption}>{hold}</Text> : null}
      <Text style={ours ? styles.oursMeta : font.caption}>{meta}</Text>
    </View>
  );
}

function Composer({ chat, quickReplies, onSend }: { chat: Chat; quickReplies: string[]; onSend: (body: string) => void }) {
  const [text, setText] = useState('');
  const blockedReason = chat.blocked
    ? 'This visitor is blocked, so you can’t reply.'
    : !chat.can_reply
      ? (textOrNull(chat.reply_block) ?? 'You can’t reply to this chat right now.')
      : null;

  const submit = () => {
    const body = text.trim();
    if (!body || blockedReason) return;
    setText('');
    onSend(body);
  };

  if (blockedReason) {
    return (
      <View style={styles.composer}>
        <Text style={[font.small, styles.center]}>{blockedReason}</Text>
      </View>
    );
  }

  return (
    <View style={styles.composer}>
      {isFuture(chat.reply_window_ends_at) ? (
        <Text style={font.caption}>You can reply until {formatDateTime(chat.reply_window_ends_at)}.</Text>
      ) : null}
      {quickReplies.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} keyboardShouldPersistTaps="handled">
          {quickReplies.map((q) => (
            <Pressable key={q} onPress={() => setText(q)} accessibilityRole="button" style={styles.quickChip}>
              <Text style={font.small} numberOfLines={1}>
                {q}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a reply"
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={CHAT_MESSAGE_MAX}
          accessibilityLabel="Reply"
          style={styles.input}
        />
        <Button title="Send" onPress={submit} disabled={!text.trim()} style={styles.send} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 220 },
  headerText: { flexShrink: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  assignBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  assignPressed: { backgroundColor: colors.background },
  assignText: { flex: 1 },
  assignAction: { fontSize: 14, fontWeight: '700', color: colors.primary },
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  headerButton: { minHeight: touchTarget, paddingHorizontal: spacing.sm },
  messages: { padding: spacing.lg, gap: spacing.sm },
  info: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs },
  center: { textAlign: 'center' },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ours: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  failed: { backgroundColor: colors.danger },
  theirsText: { fontSize: 16, color: colors.text },
  oursText: { fontSize: 16, color: colors.onPrimary },
  oursMeta: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  composer: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quick: { gap: spacing.sm },
  quickChip: {
    maxWidth: 220,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: touchTarget,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  send: { paddingHorizontal: spacing.lg },
});
