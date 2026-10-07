import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

/** 1–5 star rating; nothing for a missing rating. */
export function Stars({ rating, size = 16 }: { rating: number | null | undefined; size?: number }) {
  if (rating === null || rating === undefined) return null;
  const value = Math.round(Math.max(0, Math.min(5, rating)));
  return (
    <View style={styles.row} accessible accessibilityLabel={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons key={i} name={i < value ? 'star' : 'star-outline'} size={size} color={i < value ? colors.warning : colors.textSubtle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
});
