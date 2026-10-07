import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing, touchTarget } from '@/constants/theme';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
};

/** Starts however the caller sets it; callers that need explicit consent must start it unchecked. */
export function Checkbox({ label, checked, onChange, error }: Props) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={styles.row}
        hitSlop={4}
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={26}
          color={error ? colors.danger : checked ? colors.primary : colors.textMuted}
        />
        <Text style={[font.body, styles.label]}>{label}</Text>
      </Pressable>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { flex: 1 },
  error: { fontSize: 13, color: colors.danger },
});
