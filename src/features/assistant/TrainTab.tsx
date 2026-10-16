import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ASSISTANT_TEXT_MAX, assistantApi } from '@/api/assistant.api';
import type { BotScore, TrainingQuestion } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, radius, spacing } from '@/constants/theme';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';

const KIND_LABELS: Record<string, string> = {
  asked: 'Visitors asked this',
  usual: 'People often ask this',
  clash: 'Answers disagree',
};

/**
 * "Help train your bot" (owners and managers): this week's questions with Reply / Not relevant,
 * and the bot score. Unanswered questions roll into next week.
 */
export function TrainTab() {
  const fetcher = useCallback((signal: AbortSignal) => assistantApi.training(signal), []);
  const q = useApiQuery('assistant-training', fetcher);
  const [done, setDone] = useState<number[]>([]);
  const [score, setScore] = useState<{ for: unknown; score: BotScore } | null>(null);

  if (q.loading) return <LoadingView />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={q.reload} /> : null;
  const shownScore = score && score.for === q.data ? score.score : q.data.score;
  const questions = q.data.questions.filter((x) => !done.includes(x.id));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor={colors.primary} />}
    >
      <Card title="Bot score">
        <Text style={styles.score}>{shownScore.percent}%</Text>
        <Text style={font.small}>
          It can answer {shownScore.answered} of the {shownScore.usual_total} questions people usually ask.
        </Text>
      </Card>
      {questions.length === 0 ? (
        <EmptyState icon="school-outline" title="Nothing to train this week" message="New questions come every Monday." />
      ) : (
        questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onDone={(next) => {
              setDone((list) => [...list, question.id]);
              if (next) setScore({ for: q.data, score: next });
            }}
          />
        ))
      )}
    </ScrollView>
  );
}

function QuestionCard({ question, onDone }: { question: TrainingQuestion; onDone: (score: BotScore | null) => void }) {
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState<'answer' | 'dismiss' | null>(null);

  const run = async (kind: 'answer' | 'dismiss') => {
    setBusy(kind);
    try {
      if (kind === 'answer') onDone((await assistantApi.answerTraining(question.id, answer.trim())).score);
      else {
        await assistantApi.dismissTraining(question.id);
        onDone(null);
      }
    } catch (e) {
      Alert.alert('Couldn’t save it', toApiError(e).message);
      setBusy(null);
    }
  };

  return (
    <Card>
      <Badge label={KIND_LABELS[question.kind] ?? 'Question'} />
      <Text style={styles.question}>{question.text}</Text>
      {question.asked_count > 0 ? (
        <Text style={font.caption}>
          Asked {question.asked_count} {question.asked_count === 1 ? 'time' : 'times'}
        </Text>
      ) : null}
      <TextInput
        value={answer}
        onChangeText={setAnswer}
        placeholder="Your answer"
        placeholderTextColor={colors.textSubtle}
        multiline
        maxLength={ASSISTANT_TEXT_MAX}
        accessibilityLabel={`Answer to: ${question.text}`}
        style={styles.input}
        textAlignVertical="top"
      />
      <View style={styles.actions}>
        <Button title="Reply" onPress={() => run('answer')} loading={busy === 'answer'} disabled={!answer.trim() || !!busy} style={styles.action} />
        <Button title="Not relevant" variant="secondary" onPress={() => run('dismiss')} loading={busy === 'dismiss'} disabled={!!busy} style={styles.action} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  score: { fontSize: 34, fontWeight: '800', color: colors.primary },
  question: { fontSize: 17, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flexGrow: 1 },
});
