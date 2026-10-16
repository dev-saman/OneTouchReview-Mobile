import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { COACH_MIN, REPLY_MAX, reviewsApi, waitingDraftText } from '@/api/reviews.api';
import type { ApiError, GoogleReview, ReplyCoach, ReviewChange } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Stars } from '@/components/ui/Stars';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, radius, spacing } from '@/constants/theme';
import { changeLabel } from '@/features/reviews/changes';
import { NotesCard } from '@/features/reviews/NotesCard';
import { TagsCard } from '@/features/reviews/TagsCard';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { formatDate } from '@/utils/format';

/**
 * Screen 4 detail (also the push / bell deep link): read, AI draft, edit and post the reply, and
 * what changed on Google (row 69). Removed reviews are read-only.
 */
export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewId = Number(id);
  const fetcher = useCallback(async (signal: AbortSignal) => {
    const [review, changes] = await Promise.all([
      reviewsApi.get(reviewId, signal),
      // The history is extra: the review still shows if it can't load.
      reviewsApi.changes(reviewId, signal).catch((): ReviewChange[] => []),
    ]);
    return { ...review, history: changes };
  }, [reviewId]);
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery(reviewId, fetcher);
  const loadNotes = useCallback((signal: AbortSignal) => reviewsApi.notes(reviewId, signal), [reviewId]);
  const addNote = useCallback((body: string) => reviewsApi.addNote(reviewId, body), [reviewId]);
  // Reply changes answer with the updated review: shown on top of the loaded one.
  const [changes, setChanges] = useState<Partial<GoogleReview>>({});
  const [shownFor, setShownFor] = useState(data);
  if (shownFor !== data) {
    setShownFor(data);
    setChanges({});
  }

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;
  const review = { ...data, ...changes };

  return (
    <KeyboardAvoider>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Card>
          <View style={styles.headerRow}>
            <Text style={font.heading}>{review.reviewer_name || 'Google user'}</Text>
            <Stars rating={review.rating} size={18} />
          </View>
          {review.comment ? <Text style={styles.text}>{review.comment}</Text> : <Text style={font.small}>Rating only, no comment.</Text>}
          {review.points?.length ? (
            <View style={styles.points}>
              {review.points.map((p) => (
                <Badge key={p.id} label={p.name} tone={p.kind === 'like' ? 'success' : 'neutral'} />
              ))}
            </View>
          ) : null}
          <Text style={font.caption}>{[review.location?.name, formatDate(review.review_time)].filter(Boolean).join(' · ')}</Text>
          {review.removed_at ? <Badge label={`Removed from Google ${formatDate(review.removed_at)}`} tone="danger" /> : null}
        </Card>

        {review.history.length ? <ChangesCard changes={review.history} /> : null}

        {review.removed_at ? null : (
          <ReplySection
            // Remount the editor when the posted reply changes, so it starts from the new text.
            key={review.reply_comment ?? 'none'}
            review={review}
            onChanged={(change) => setChanges((c) => ({ ...c, ...change }))}
          />
        )}

        <TagsCard key={`tags-${review.id}`} tags={review.tags ?? []} onSave={(ids) => reviewsApi.setTags(review.id, ids)} />

        <NotesCard reviewKey={`google-${review.id}`} load={loadNotes} add={addNote} />
      </ScrollView>
    </KeyboardAvoider>
  );
}

/** GET /google-reviews/{id}/changes, newest first. */
function ChangesCard({ changes }: { changes: ReviewChange[] }) {
  return (
    <Card title="What changed on Google">
      {changes.map((change) => (
        <View key={change.id} style={styles.change}>
          <Text style={styles.changeTitle}>{changeLabel(change.kind, change.old_rating, change.new_rating)}</Text>
          <Text style={font.caption}>{formatDate(change.detected_at)}</Text>
          {change.kind === 'edited' && change.old_text !== change.new_text ? (
            <>
              {change.old_text ? <Text style={[font.small, styles.before]}>Before: {change.old_text}</Text> : null}
              {change.new_text ? <Text style={font.body}>Now: {change.new_text}</Text> : null}
            </>
          ) : null}
          {change.reply_may_need_update ? <Badge label="Your reply may need an update" tone="warning" /> : null}
        </View>
      ))}
    </Card>
  );
}

function ReplySection({ review, onChanged }: { review: GoogleReview; onChanged: (change: Partial<GoogleReview>) => void }) {
  const posted = review.reply_comment;
  const waitingDraft = waitingDraftText(review.ai_reply);
  const [editing, setEditing] = useState(!posted);
  const [text, setText] = useState(posted ?? waitingDraft);
  const [busy, setBusy] = useState<'draft' | 'coach' | 'save' | 'delete' | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [coach, setCoach] = useState<ReplyCoach | null>(null);

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(null);
    }
  };

  const draft = () =>
    run('draft', async () => {
      setText(await reviewsApi.aiDraft(review.id));
      setCoach(null);
    });

  const check = () =>
    run('coach', async () => {
      setCoach(await reviewsApi.coach(review.id, text.trim()));
    });

  const save = () =>
    run('save', async () => {
      const reply = text.trim();
      const answer = posted ? await reviewsApi.editReply(review.id, reply) : await reviewsApi.postReply(review.id, reply);
      onChanged({
        reply_comment: answer.review.reply_comment ?? reply,
        reply_time: answer.review.reply_time ?? null,
        ai_reply: answer.review.ai_reply ?? null,
      });
      const googleError = typeof answer.google_error === 'string' ? answer.google_error : null;
      if (answer.posted_to_google === false) {
        Alert.alert('Saved, but not on Google yet', googleError ?? answer.message);
      } else {
        Alert.alert(posted ? 'Reply updated' : 'Reply posted', answer.message);
      }
    });

  const remove = () =>
    Alert.alert('Delete your reply?', 'It will be removed from Google.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run('delete', async () => {
            await reviewsApi.deleteReply(review.id);
            onChanged({ reply_comment: null, reply_time: null });
          }),
      },
    ]);

  if (posted && !editing) {
    return (
      <Card title="Your reply">
        <Text style={styles.text}>{posted}</Text>
        {review.reply_time ? <Text style={font.caption}>Posted {formatDate(review.reply_time)}</Text> : null}
        {error ? <Text style={styles.error}>{error.message}</Text> : null}
        <View style={styles.actions}>
          <Button title="Edit" variant="secondary" onPress={() => setEditing(true)} style={styles.action} />
          <Button title="Delete" variant="text" onPress={remove} loading={busy === 'delete'} style={styles.action} />
        </View>
      </Card>
    );
  }

  const trimmed = text.trim();
  return (
    <Card title={posted ? 'Edit your reply' : 'Reply'}>
      {waitingDraft && !posted ? <Badge label="AI draft — check it before posting" /> : null}
      <TextInput
        value={text}
        onChangeText={(value) => {
          setText(value);
          setCoach(null);
        }}
        placeholder="Write a reply. It’s posted publicly on Google."
        placeholderTextColor={colors.textSubtle}
        multiline
        maxLength={REPLY_MAX}
        accessibilityLabel="Reply"
        style={styles.editor}
        textAlignVertical="top"
      />
      <Text style={[font.caption, styles.counter]}>
        {text.length} / {REPLY_MAX}
      </Text>

      {coach ? <CoachTips coach={coach} onUse={(improved) => { setText(improved); setCoach(null); }} /> : null}
      {error ? <Text style={styles.error}>{error.message}</Text> : null}

      <View style={styles.actions}>
        <Button title={text ? 'New AI draft' : 'Draft with AI'} variant="secondary" onPress={draft} loading={busy === 'draft'} disabled={!!busy} style={styles.action} />
        <Button
          title="Check my reply"
          variant="secondary"
          onPress={check}
          loading={busy === 'coach'}
          disabled={!!busy || trimmed.length < COACH_MIN}
          style={styles.action}
        />
      </View>
      <Button title={posted ? 'Save changes' : 'Post reply'} onPress={save} loading={busy === 'save'} disabled={!!busy || !trimmed} />
      {posted ? <Button title="Cancel" variant="text" onPress={() => { setEditing(false); setText(posted); setCoach(null); setError(null); }} /> : null}
    </Card>
  );
}

function CoachTips({ coach, onUse }: { coach: ReplyCoach; onUse: (text: string) => void }) {
  return (
    <View style={styles.coach}>
      {coach.tips.length === 0 ? <Text style={font.small}>Looks good.</Text> : null}
      {coach.tips.map((tip) => (
        <View key={tip.id} style={styles.tip}>
          <Text style={[font.body, tip.kind === 'warning' && styles.warningText]}>{tip.message}</Text>
          {tip.suggestion ? <Text style={font.small}>{tip.suggestion}</Text> : null}
        </View>
      ))}
      {coach.improved_text ? (
        <>
          <Text style={styles.improvedLabel}>Suggested version</Text>
          <Text style={font.body}>{coach.improved_text}</Text>
          <Button title="Use this version" variant="text" onPress={() => onUse(coach.improved_text!)} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  text: { fontSize: 17, lineHeight: 24, color: colors.text },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  editor: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  counter: { textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  error: { color: colors.danger, fontSize: 14 },
  coach: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  tip: { gap: 2 },
  warningText: { color: colors.warning, fontWeight: '600' },
  improvedLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
  change: { gap: spacing.xs, paddingVertical: spacing.xs },
  changeTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  before: { textDecorationLine: 'line-through' },
});
