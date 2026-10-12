import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

import { KeyboardAvoider } from './KeyboardAvoider';

type Props = {
  children: ReactNode;
  /** Scrollable form/content screen (default) or a fixed layout (lists manage their own scrolling). */
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

export function Screen({ children, scroll = true, edges = ['bottom'], contentStyle }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoider>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
});
