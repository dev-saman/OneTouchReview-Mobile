import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { ApiError } from '@/api/types';
import { colors, font, spacing } from '@/constants/theme';

import { Button } from './Button';

/** Bottom of a paged list: spinner while loading more, or the error with a retry. */
export function ListFooter({
  loadingMore,
  moreError,
  onRetry,
}: {
  loadingMore: boolean;
  moreError: ApiError | null;
  onRetry: () => void;
}) {
  if (loadingMore) return <ActivityIndicator style={styles.footer} color={colors.primary} />;
  if (!moreError) return null;
  return (
    <View style={styles.footer}>
      <Text style={[font.small, styles.center]}>{moreError.message}</Text>
      <Button title="Load more" variant="text" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { padding: spacing.lg, gap: spacing.sm },
  center: { textAlign: 'center' },
});
