import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SITE_REPLY_MAX, siteReviewsApi } from '@/api/siteReviews.api';
import type { ApiError, SiteAiReply, SiteReview } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { KeyboardAvoider } from '@/components/ui/KeyboardAvoider';
import { Stars } from '@/components/ui/Stars';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { can } from '@/config/permissions';
import { colors, font, radius, spacing } from '@/constants/theme';
import { NotesCard } from '@/features/reviews/NotesCard';
import { recommendLabel } from '@/features/reviews/SiteReviewsList';
import { siteIcon } from '@/features/reviews/sites';
import { TagsCard } from '@/features/reviews/TagsCard';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { useAppSelector } from '@/store/hooks';
import { formatDate } from '@/utils/format';

/** Only web links from the API are opened. */
function openLink(url: string | null | undefined) {
  if (url && /^https?:\/\//i.test(url)) Linking.openURL(url).catch(() => {});
}

/**
 * Screen 4, a review from another site (also the site_review push and bell deep link). The reply is
 * posted from the app only where can_reply is true (owners and managers); elsewhere: copy the
 * suggested reply and "Open on {site}" to paste it.
 */
export default function SiteReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewId = Number(id);
  const fetcher = useCallback((signal: AbortSignal) => siteReviewsApi.get(reviewId, signal), [reviewId]);
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery(`site-review|${reviewId}`, fetcher);
  // Reply changes answer with the updated review, shown instead of the loaded one.
  const [updated, setUpdated] = useState<{ for: unknown; review: SiteReview } | null>(null);
  const loadNotes = useCallback((signal: AbortSignal) => siteReviewsApi.notes(reviewId, signal), [reviewId]);
  const addNote = useCallback((body: string) => siteReviewsApi.addNote(reviewId, body), [reviewId]);

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;
  const review = updated && updated.for === data ? updated.review : data;
  const recommend = recommendLabel(review.recommends);

  return (
    <KeyboardAvoider>
      <Stack.Screen options={{ title: review.platform_name }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Card>
          <View style={styles.headerRow}>
            <IconTile name={siteIcon(review.platform)} size={36} />
            <View style={styles.flex}>
              <Text style={font.heading}>{review.reviewer_first_name || `${review.platform_name} reviewer`}</Text>
              <Text style={font.caption}>{review.platform_name}</Text>
            </View>
            {review.rating !== null ? <Stars rating={review.rating} size={18} /> : null}
          </View>
          {recommend ? <Badge label={recommend} tone={review.recommends ? 'success' : 'warning'} /> : null}
          {review.title ? <Text style={styles.title}>{review.title}</Text> : null}
          {review.body ? <Text style={styles.text}>{review.body}</Text> : <Text style={font.small}>No text, rating only.</Text>}
          {review.points.length ? (
            <View style={styles.wrap}>
              {review.points.map((p) => (
                <Badge key={p.id} label={p.name} tone={p.kind === 'like' ? 'success' : 'neutral'} />
              ))}
            </View>
          ) : null}
          <Text style={font.caption}>{[review.location?.name, formatDate(review.posted_on)].filter(Boolean).join(' · ')}</Text>
          {review.url ? (
            <Button title={`Open on ${review.platform_name}`} variant="text" icon="open-outline" onPress={() => openLink(review.url)} />
          ) : null}
        </Card>

        <ReplyCard review={review} onUpdated={(next) => setUpdated({ for: data, review: next })} />

        <TagsCard key={`tags-${review.id}`} tags={review.tags} onSave={(ids) => siteReviewsApi.setTags(review.id, ids)} />

        <NotesCard reviewKey={`site-${review.id}`} load={loadNotes} add={addNote} />
      </ScrollView>
    </KeyboardAvoider>
  );
}

function ReplyCard({ review, onUpdated }: { review: SiteReview; onUpdated: (review: SiteReview) => void }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  const canPost = review.can_reply && can(role, 'manageReviews');
  const posted = review.owner_response;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [suggestion, setSuggestion] = useState<SiteAiReply | null>(null);
  const [busy, setBusy] = useState<'suggest' | 'post' | 'delete' | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

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

  const suggest = () =>
    run('suggest', async () => {
      const answer = await siteReviewsApi.aiReply(review.id, suggestion !== null);
      setSuggestion(answer);
      if (canPost) {
        setText(answer.reply);
        setEditing(true);
      }
    });

  const post = () =>
    run('post', async () => {
      onUpdated(await siteReviewsApi.postReply(review.id, text.trim()));
      setEditing(false);
      Alert.alert(posted ? 'Reply updated' : 'Reply posted');
    });

  const remove = () =>
    Alert.alert('Delete your reply?', `It will be removed from ${review.platform_name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => run('delete', async () => onUpdated(await siteReviewsApi.deleteReply(review.id))),
      },
    ]);

  const copy = async () => {
    if (!suggestion) return;
    await Clipboard.setStringAsync(suggestion.reply);
    Alert.alert('Copied', `Paste it into your reply on ${review.platform_name}.`);
  };

  if (editing && canPost) {
    return (
      <Card title={posted ? 'Edit your reply' : 'Reply'}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={`Write a reply. It’s posted publicly on ${review.platform_name}.`}
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={SITE_REPLY_MAX}
          accessibilityLabel="Reply"
          style={styles.editor}
          textAlignVertical="top"
        />
        <Text style={[font.caption, styles.counter]}>
          {text.length} / {SITE_REPLY_MAX}
        </Text>
        {suggestion?.message ? <Text style={font.caption}>{suggestion.message}</Text> : null}
        {error ? <Text style={styles.error}>{error.message}</Text> : null}
        <Button title="New suggestion" variant="secondary" onPress={suggest} loading={busy === 'suggest'} disabled={!!busy} />
        <Button title={posted ? 'Save changes' : 'Post reply'} onPress={post} loading={busy === 'post'} disabled={!!busy || !text.trim()} />
        <Button title="Cancel" variant="text" onPress={() => { setEditing(false); setError(null); }} />
      </Card>
    );
  }

  const pasteUrl = suggestion?.reply_url ?? review.reply_url;
  return (
    <Card title={posted ? 'Your reply' : 'Reply'}>
      {posted ? (
        <>
          <Text style={styles.text}>{posted.text}</Text>
          {posted.posted_on ? <Text style={font.caption}>Posted {formatDate(posted.posted_on)}</Text> : null}
        </>
      ) : null}

      {suggestion && !canPost ? (
        <View style={styles.suggestion}>
          <Text style={styles.text} selectable>
            {suggestion.reply}
          </Text>
          {suggestion.message ? <Text style={font.caption}>{suggestion.message}</Text> : null}
          <View style={styles.wrap}>
            <Button title="Copy" onPress={copy} style={styles.action} />
            {pasteUrl ? (
              <Button
                title={`Open on ${review.platform_name} to paste`}
                variant="secondary"
                onPress={() => openLink(pasteUrl)}
                style={styles.action}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {!posted && !suggestion && !canPost ? (
        <Text style={font.small}>Replies to {review.platform_name} reviews are posted on {review.platform_name}. Get a suggested reply to copy and paste there.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error.message}</Text> : null}

      <View style={styles.wrap}>
        {canPost ? (
          <Button
            title={posted ? 'Edit' : 'Write a reply'}
            variant="secondary"
            onPress={() => {
              setText(posted?.text ?? '');
              setEditing(true);
            }}
            style={styles.action}
          />
        ) : null}
        {!posted || !canPost ? (
          <Button
            title={suggestion ? 'Suggest another' : 'Suggest a reply'}
            variant={canPost ? 'secondary' : 'primary'}
            icon="sparkles-outline"
            onPress={suggest}
            loading={busy === 'suggest'}
            disabled={!!busy}
            style={styles.action}
          />
        ) : null}
        {posted?.can_edit && can(role, 'manageReviews') ? (
          <Button title="Delete" variant="text" onPress={remove} loading={busy === 'delete'} style={styles.action} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  text: { fontSize: 17, lineHeight: 24, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  suggestion: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
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
  error: { color: colors.danger, fontSize: 14 },
});
