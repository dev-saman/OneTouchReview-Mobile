import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';

/** App-wide. Losing connection never signs the user out; it only shows this. */
export function OfflineBanner() {
  const offline = useAppSelector((s) => s.network.isConnected === false);
  const insets = useSafeAreaInsets();
  if (!offline) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{"You're offline. Some information may be out of date."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Overlays the top of the current screen so it never shifts navigation headers.
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warningSurface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  text: { color: colors.warning, fontSize: 13, textAlign: 'center' },
});
