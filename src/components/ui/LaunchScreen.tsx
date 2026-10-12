import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, radius, spacing } from '@/constants/theme';

import { BrandMark, BrandWordmark } from './Brand';

/** Startup is usually under a second; the loading bar only appears if it takes longer. */
const SHOW_PROGRESS_AFTER_MS = 800;

/**
 * Shown while the app starts (app-config, identity, locations). Takes over from the native
 * splash, which can only show a centred icon. `onReady` fires once it has drawn.
 */
export function LaunchScreen({ onReady }: { onReady?: () => void }) {
  const { width, height } = useWindowDimensions();
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowProgress(true), SHOW_PROGRESS_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.screen} onLayout={onReady} accessibilityLabel="OneTouchReview is starting" accessible>
      <Waves width={width} height={height} />
      <View style={styles.center}>
        <BrandMark size={132} />
        <BrandWordmark width={Math.min(260, width - spacing.xxl * 2)} />
        <Text style={styles.tagline}>Your reputation in your hands</Text>
        <View style={styles.progressSlot}>{showProgress ? <ProgressBar /> : null}</View>
      </View>
    </View>
  );
}

/** Indeterminate bar: a teal segment sliding across a light track. */
function ProgressBar() {
  const [position] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(position, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [position]);

  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [-TRACK_WIDTH * 0.45, TRACK_WIDTH] });
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.bar, { transform: [{ translateX }] }]} />
    </View>
  );
}

/** Soft teal curves along the bottom, as in the brand artwork. Decorative. */
function Waves({ width, height }: { width: number; height: number }) {
  const w = width;
  const h = height * 0.42;
  return (
    <Svg width={w} height={h} style={styles.waves} pointerEvents="none">
      <Defs>
        <LinearGradient id="back" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#05B287" stopOpacity="0.10" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="0.28" />
        </LinearGradient>
        <LinearGradient id="front" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#0DD291" stopOpacity="0.30" />
          <Stop offset="1" stopColor={colors.primary} stopOpacity="0.06" />
        </LinearGradient>
      </Defs>
      <Path d={`M0 ${h * 0.55} C ${w * 0.35} ${h * 0.25}, ${w * 0.7} ${h * 0.95}, ${w} ${h * 0.35} L ${w} ${h} L 0 ${h} Z`} fill="url(#back)" />
      <Path d={`M0 ${h * 0.8} C ${w * 0.3} ${h * 0.55}, ${w * 0.55} ${h * 0.6}, ${w} ${h * 0.75} L ${w} ${h} L 0 ${h} Z`} fill="url(#front)" />
    </Svg>
  );
}

const TRACK_WIDTH = 200;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  tagline: { fontSize: 16, color: colors.textMuted },
  progressSlot: { height: 4, marginTop: spacing.xl },
  track: { width: TRACK_WIDTH, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  bar: { width: TRACK_WIDTH * 0.45, height: 4, borderRadius: radius.pill, backgroundColor: colors.primary },
  waves: { position: 'absolute', left: 0, bottom: 0 },
});
