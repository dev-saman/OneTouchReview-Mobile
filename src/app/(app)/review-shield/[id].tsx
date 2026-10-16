import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { reviewExtrasApi } from '@/api/siteReviews.api';
import type { ReviewShieldStatus } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { Stars } from '@/components/ui/Stars';
import { ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, spacing } from '@/constants/theme';
import { useApiQuery } from '@/hooks/useApiQuery';
import { openWebApp } from '@/services/web/openWebApp';
import { formatDate } from '@/utils/format';

const STATUS_LABELS: Record<ReviewShieldStatus, string> = {
  open: 'May break Google’s rules',
  reported: 'Reported to Google',
  appealed: 'Appealed',
  kept: 'Google kept it',
  kept_final: 'Google kept it (final)',
  removed: 'Removed by Google',
  dismissed: 'Dismissed',
};

/**
 * A Google review that may break Google's rules (review_shield push and bell deep link). Read-only:
 * reporting it is web only. Owners and managers.
 */
export default function ReviewShieldScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const flagId = Number(id);
  const fetcher = useCallback((signal: AbortSignal) => reviewExtrasApi.shieldFlag(flagId, signal), [flagId]);
  const { data: flag, error, loading, refreshing, reload, refresh } = useApiQuery(`shield|${flagId}`, fetcher);

  if (loading) return <LoadingView />;
  if (!flag) return error ? <ErrorState error={error} onRetry={reload} /> : null;
  const review = flag.review;
  const status = STATUS_LABELS[flag.status as ReviewShieldStatus] ?? flag.status;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <Card title={flag.category_label}>
        <Badge label={status} tone={flag.status === 'removed' ? 'success' : flag.status === 'open' ? 'warning' : 'neutral'} />
        {flag.explanation ? <Text style={styles.text}>{flag.explanation}</Text> : null}
        {flag.quote ? <Text style={[font.small, styles.quote]}>“{flag.quote}”</Text> : null}
        <Text style={font.caption}>Flagged {formatDate(flag.flagged_at)}</Text>
      </Card>

      <Card title="The review">
        <View style={styles.headerRow}>
          <Text style={[font.heading, styles.flex]}>{review.reviewer_name || 'Google user'}</Text>
          <Stars rating={review.rating} size={18} />
        </View>
        {review.comment ? <Text style={styles.text}>{review.comment}</Text> : <Text style={font.small}>Rating only, no comment.</Text>}
        <Text style={font.caption}>{[review.location_name, formatDate(review.review_time)].filter(Boolean).join(' · ')}</Text>
        {review.removed_at ? <Badge label={`Removed from Google ${formatDate(review.removed_at)}`} tone="success" /> : null}
        {review.reply_comment ? <Text style={font.small}>Your reply: {review.reply_comment}</Text> : null}
        {review.removed_at ? null : (
          <Button
            title="Open the review"
            variant="text"
            onPress={() => router.push({ pathname: '/reviews/[id]', params: { id: String(review.id) } })}
          />
        )}
      </Card>

      {flag.status === 'open' ? (
        <Card>
          <Text style={font.body}>Open OneTouchReview on the web to report it.</Text>
          <Button title="Open on the web" variant="secondary" icon="open-outline" onPress={() => openWebApp()} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  text: { fontSize: 17, lineHeight: 24, color: colors.text },
  quote: { fontStyle: 'italic' },
});
