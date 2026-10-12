import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '@/constants/theme';

import { BrandMark } from './Brand';
import type { IconName } from './IconTile';

/** Centred top of the sign-in screens: the brand mark (or an icon), a title and a line under it. */
export function AuthHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: IconName }) {
  return (
    <View style={styles.header}>
      {icon ? (
        <View style={styles.iconCircle} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Ionicons name={icon} size={34} color={colors.primary} />
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
