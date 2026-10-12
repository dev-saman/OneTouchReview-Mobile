import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type TileTone = 'brand' | 'accent' | 'info' | 'danger';

const TONES: Record<TileTone, { backgroundColor: string; color: string }> = {
  brand: { backgroundColor: colors.primarySoft, color: colors.primary },
  accent: { backgroundColor: colors.accentSoft, color: colors.accent },
  info: { backgroundColor: colors.infoSoft, color: colors.info },
  danger: { backgroundColor: colors.dangerSurface, color: colors.danger },
};

/** A small rounded square with an icon, used on stats and menu rows. Decorative. */
export function IconTile({ name, tone = 'brand', size = 40 }: { name: IconName; tone?: TileTone; size?: number }) {
  const { backgroundColor, color } = TONES[tone];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.tile, { width: size, height: size, backgroundColor }]}
    >
      <Ionicons name={name} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
