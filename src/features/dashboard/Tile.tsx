import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, shadow, spacing } from '@/constants/theme';

/** A dashboard tile: a card with a title and, when it opens a screen, a chevron and a tap target. */
export function Tile({ title, onPress, hint, children }: { title: string; onPress?: () => void; hint?: string; children: ReactNode }) {
  const body = (
    <>
      <View style={styles.header}>
        <Text style={[font.heading, styles.flex]} accessibilityRole="header">
          {title}
        </Text>
        {onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}
      </View>
      {children}
    </>
  );
  if (!onPress) return <View style={styles.tile}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={hint}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/** One "this month" style number with an up/down arrow against the period before. */
export function Delta({ current, previous }: { current: number; previous: number | null | undefined }) {
  if (previous === null || previous === undefined || current === previous) return null;
  const up = current > previous;
  return (
    <View style={styles.delta} accessible accessibilityLabel={`${up ? 'Up' : 'Down'} from ${previous}`}>
      <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={14} color={up ? colors.success : colors.danger} />
      <Text style={[font.caption, { color: up ? colors.success : colors.danger }]}>{previous}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  pressed: { opacity: 0.8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
