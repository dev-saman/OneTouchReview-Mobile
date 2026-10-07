import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { aiApi } from '@/api/reports.api';
import type { ApiError } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { can } from '@/config/permissions';
import { colors, font, radius, spacing, touchTarget } from '@/constants/theme';
import { textOrNull } from '@/features/chats/format';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useAppSelector } from '@/store/hooks';

type Turn = { id: number; question: string; answer: string | null; error: ApiError | null };

const textItems = (items: unknown[] | undefined) =>
  (items ?? []).filter((i): i is string => typeof i === 'string' && !!i.trim());

/** Screen 12: Ask AI — answers questions about the business's own data. Owners and managers. */
export default function AskAiScreen() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const allowed = can(role, 'askAi');

  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      if (!allowed) return null;
      const [status, starters] = await Promise.all([aiApi.status(signal), aiApi.suggestions(signal)]);
      return { status, starters };
    },
    [allowed],
  );
  const q = useApiQuery(allowed ? 'ai' : 'ai-off', fetcher);

  if (!allowed) return <EmptyState title="Ask AI is for owners and managers" message="Ask the owner if you need it." />;
  if (q.loading) return <LoadingView />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;
  if (!q.data.status.available) {
    return <EmptyState title="Ask AI isn’t available right now" message={textOrNull(q.data.status.reason) ?? undefined} />;
  }
  return <Conversation starters={q.data.starters.suggestions} initialLeft={q.data.starters.asks_left_today} />;
}

function Conversation({ starters, initialLeft }: { starters: string[]; initialLeft: number }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [asksLeft, setAsksLeft] = useState(initialLeft);
  const [text, setText] = useState('');
  const [asking, setAsking] = useState(false);
  const nextId = useRef(1);
  const scroll = useRef<ScrollView>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || asking || asksLeft <= 0) return;
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question: q, answer: null, error: null }]);
    setText('');
    setFollowUps([]);
    setAsking(true);
    try {
      const answer = await aiApi.ask(q);
      setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, answer: answer.answer } : turn)));
      setFollowUps(textItems(answer.follow_ups));
      setAsksLeft(answer.asks_left_today);
    } catch (e) {
      setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, error: toApiError(e) } : turn)));
    } finally {
      setAsking(false);
    }
  };

  const chips = turns.length === 0 ? starters : followUps;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {turns.length === 0 ? (
            <View style={styles.intro}>
              <Text style={font.heading}>Ask about your reviews, feedback and requests</Text>
              <Text style={font.small}>Answers use your business’s own data.</Text>
            </View>
          ) : null}
          {turns.map((turn) => (
            <View key={turn.id} style={styles.turn}>
              <View style={[styles.bubble, styles.question]}>
                <Text style={styles.questionText}>{turn.question}</Text>
              </View>
              <View style={[styles.bubble, styles.answer]}>
                {turn.answer ? (
                  <Text style={font.body} selectable>
                    {turn.answer}
                  </Text>
                ) : turn.error ? (
                  <Text style={styles.error}>{turn.error.message}</Text>
                ) : (
                  <Text style={font.small}>Thinking…</Text>
                )}
              </View>
            </View>
          ))}
          {chips.length && !asking ? (
            <View style={styles.chips}>
              {chips.map((s) => (
                <Pressable key={s} onPress={() => ask(s)} accessibilityRole="button" style={styles.chip}>
                  <Text style={font.small}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <Text style={font.caption}>
            {asksLeft > 0 ? `${asksLeft} ${asksLeft === 1 ? 'question' : 'questions'} left today` : 'No questions left today. Try again tomorrow.'}
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Ask a question"
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Question"
              multiline
              editable={asksLeft > 0}
              style={styles.input}
            />
            <Button title="Ask" onPress={() => ask(text)} loading={asking} disabled={!text.trim() || asksLeft <= 0} style={styles.send} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  intro: { gap: spacing.xs, marginBottom: spacing.sm },
  turn: { gap: spacing.sm },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  question: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  questionText: { fontSize: 16, color: colors.onPrimary },
  answer: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, fontSize: 14 },
  chips: { gap: spacing.sm },
  chip: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  composer: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: touchTarget,
    maxHeight: 120,
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
