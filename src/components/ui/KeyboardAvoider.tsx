import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, StyleSheet, View, type ViewStyle } from 'react-native';

/**
 * Keeps inputs clear of the keyboard on both platforms.
 *
 * Android: SDK 57 is edge-to-edge, so the window no longer resizes for the keyboard
 * (adjustResize is ignored) and a KeyboardAvoidingView without `behavior` does nothing.
 * `padding` is used on both platforms. If the window ever does resize, the measured frame
 * shrinks and the padding collapses to zero on its own, so it can't double up.
 *
 * KeyboardAvoidingView works out the overlap from its frame relative to its *parent*, so under
 * a navigation header it under-shoots by the header height. Instead of a hard-coded offset,
 * this measures where it actually sits on screen and passes that as keyboardVerticalOffset.
 */
export function KeyboardAvoider({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState(0);

  const measure = () => {
    ref.current?.measureInWindow((_x, y) => {
      if (Number.isFinite(y)) setOffset((current) => (current === y ? current : y));
    });
  };

  return (
    <View ref={ref} style={[styles.flex, style]} onLayout={measure}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={offset}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
