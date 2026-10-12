import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { initials } from '@/utils/format';

/** Initials in a tinted circle. Decorative: the name is always shown next to it. */
export function Avatar({ name, size = 44, solid = false }: { name: string | null | undefined; size?: number; solid?: boolean }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        solid && styles.solid,
      ]}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.36) }, solid && styles.solidText]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  solid: { backgroundColor: colors.primary },
  text: { fontWeight: '700', color: colors.primary },
  solidText: { color: colors.onPrimary },
});
