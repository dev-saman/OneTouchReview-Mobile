import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radius, spacing, touchTarget } from '@/constants/theme';

import type { IconName } from './IconTile';

type Variant = 'primary' | 'secondary' | 'text' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
  /** Optional leading icon. */
  icon?: IconName;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, accessibilityHint, icon }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !inactive && styles[`${variant}Pressed` as const],
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={labelStyles[variant].color} /> : null}
          <Text style={[styles.label, labelStyles[variant]]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  secondaryPressed: { backgroundColor: colors.background },
  text: { backgroundColor: 'transparent' },
  textPressed: { opacity: 0.6 },
  danger: { backgroundColor: colors.danger },
  dangerPressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '600' },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.onPrimary },
  secondary: { color: colors.text },
  text: { color: colors.primary },
  danger: { color: colors.onPrimary },
});
