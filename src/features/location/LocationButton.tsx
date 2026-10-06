import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing, touchTarget } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';

import { selectLocationLabel } from './selectors';

/** Header control. Only shown when the business has more than one location. */
export function LocationButton() {
  const router = useRouter();
  const label = useAppSelector(selectLocationLabel);
  const multiple = useAppSelector((s) => s.location.locations.length > 1);
  if (!multiple || !label) return null;

  return (
    <Pressable
      onPress={() => router.push('/location-picker')}
      accessibilityRole="button"
      accessibilityLabel={`Location: ${label}. Change location`}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={8}
    >
      <Ionicons name="location-outline" size={16} color={colors.primary} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touchTarget,
    maxWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  label: { color: colors.primary, fontWeight: '600', fontSize: 15, flexShrink: 1 },
});
