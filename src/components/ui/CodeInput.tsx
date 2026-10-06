import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export const CODE_LENGTH = 6;

/** Keeps digits only and caps at six — handles typing, paste and OS autofill alike. */
export function sanitizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

type Props = {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
};

/**
 * Six boxes over one hidden TextInput, so paste and one-time-code autofill work natively.
 * The code is held only in the calling screen's local state, never stored.
 */
export function CodeInput({ value, onChange, onComplete, error, autoFocus = true, editable = true }: Props) {
  const inputRef = useRef<TextInput>(null);

  const handleChange = (text: string) => {
    const code = sanitizeCode(text);
    onChange(code);
    if (code.length === CODE_LENGTH) onComplete?.(code);
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false}>
      <View style={styles.row}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const active = editable && i === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <View key={i} style={[styles.box, active && styles.boxActive, error && styles.boxError]}>
              <Text style={styles.digit}>{value[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        autoFocus={autoFocus}
        editable={editable}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH + 10 /* allow pasting "123 456" before sanitizing */}
        accessibilityLabel="Six-digit code"
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  box: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary, borderWidth: 2 },
  boxError: { borderColor: colors.danger },
  digit: { fontSize: 24, fontWeight: '600', color: colors.text },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
