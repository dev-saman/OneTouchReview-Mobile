import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '@/constants/theme';

import { BrandMark } from './Brand';
import type { IconName } from './IconTile';

const TONES = {
  brand: { backgroundColor: colors.primarySoft, color: colors.primary },
  info: { backgroundColor: colors.infoSoft, color: colors.info },
  danger: { backgroundColor: colors.dangerSurface, color: colors.danger },
} as const;

/**
 * Centred top of the sign-in and full-screen state screens: the brand mark (or an icon in a
 * tinted circle), a title and a line under it.
 */
export function AuthHeader({
  title,
  subtitle,
  icon,
  tone = 'brand',
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  tone?: keyof typeof TONES;
}) {
  return (
    <View style={styles.header}>
      {icon ? (
        <View
          style={[styles.iconCircle, { backgroundColor: TONES[tone].backgroundColor }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Ionicons name={icon} size={34} color={TONES[tone].color} />
        </View>
      ) : (
        <BrandMark size={84} />
      )}
      <Text style={[font.title, styles.center]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={[font.small, styles.center]}>{subtitle}</Text> : null}
    </View>
  );
}

/** "or" between two ways of signing in. */
export function OrDivider() {
  return (
    <View style={styles.divider} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={styles.line} />
      <Text style={font.caption}>or</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md },
  center: { textAlign: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
