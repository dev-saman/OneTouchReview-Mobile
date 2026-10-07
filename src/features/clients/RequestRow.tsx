import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LocationRef, ReviewResponseSummary } from '@/api/types';
import { Badge } from '@/components/ui/Card';
import { colors, font, spacing, touchTarget } from '@/constants/theme';
import { formatDate, formatRating, humanize } from '@/utils/format';

type RequestLike = {
  status: string;
  channel: string | null;
  sent_at: string | null;
  created_at: string;
  location: LocationRef | null;
  response: ReviewResponseSummary | null;
  is_reminder?: boolean;
};

type Props = {
  request: RequestLike;
  /** Client name on the dashboard; omitted inside a client's own history. */
  title?: string;
  onPress?: () => void;
};

/** One review request: who / status / channel, location and date, and the rating if they answered. */
export function RequestRow({ request, title, onPress }: Props) {
  const date = formatDate(request.sent_at ?? request.created_at);
  const meta = [request.channel ? humanize(request.channel === 'sms' ? 'text' : request.channel) : null, request.location?.name, date]
    .filter(Boolean)
    .join(' · ');
  const rating = request.response?.rating;

  const content = (
    <>
      <View style={styles.main}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <View style={styles.badges}>
          <Badge label={humanize(request.status)} tone={request.status === 'sent' ? 'success' : 'neutral'} />
          {request.is_reminder ? <Badge label="Follow-up" /> : null}
        </View>
        {meta ? <Text style={font.caption}>{meta}</Text> : null}
        {request.response?.private_feedback ? (
          <Text style={font.small} numberOfLines={2}>
            “{request.response.private_feedback}”
          </Text>
        ) : null}
      </View>
      {rating !== null && rating !== undefined ? (
        <View style={styles.rating} accessibilityLabel={`Rated ${formatRating(rating)} out of 5`}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={styles.ratingText}>{formatRating(rating)}</Text>
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  main: { flex: 1, gap: spacing.xs },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  badges: { flexDirection: 'row', gap: spacing.xs },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 14, fontWeight: '600', color: colors.text },
});
