import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, font, radius, spacing } from '@/constants/theme';

export function Card({ title, children, style }: { title?: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <Text style={font.heading} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, { backgroundColor: string; color: string }> = {
  neutral: { backgroundColor: colors.background, color: colors.textMuted },
  success: { backgroundColor: '#F0FDF4', color: colors.success },
  warning: { backgroundColor: colors.warningSurface, color: colors.warning },
  danger: { backgroundColor: colors.dangerSurface, color: colors.danger },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { backgroundColor, color } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/** Label on the left, value on the right. */
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={font.small}>{label}</Text>
      <Text style={[font.body, styles.rowValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  rowValue: { flexShrink: 1, textAlign: 'right' },
});
