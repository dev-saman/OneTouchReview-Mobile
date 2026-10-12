import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { radius, spacing } from '@/constants/theme';

import { BrandMark, BrandWordmarkLight } from './Brand';

/** Startup is usually under a second; the loading bar only appears if it takes longer. */
const SHOW_PROGRESS_AFTER_MS = 800;

/** Dark brand splash. TOP matches the native splash background in app.config.ts. */
export const LAUNCH_COLORS = {
  top: '#0A2A3A',
  bottom: '#051A26',
  teal: '#00C896',
  green: '#10B981',
} as const;

/**
 * Shown while the app starts (app-config, identity, locations). Takes over from the native
 * splash, which can only show a centred icon on a plain colour. `onReady` fires once it has drawn.
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
      <Backdrop width={width} height={height} />
      <View style={styles.center}>
        <BrandMark size={140} />
        <BrandWordmarkLight width={Math.min(270, width - spacing.xxl * 2)} />
        <Text style={styles.tagline}>More reviews. A stronger business.</Text>
        <View style={styles.progressSlot}>{showProgress ? <ProgressBar /> : null}</View>
      </View>
    </View>
  );
}

/** Indeterminate bar: a teal segment sliding across a faint track. */
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

/** Navy-to-teal background with a glow behind the logo and teal light sweeps. Decorative. */
function Backdrop({ width: w, height: h }: { width: number; height: number }) {
  const glowY = h * 0.44;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={LAUNCH_COLORS.top} />
          <Stop offset="1" stopColor={LAUNCH_COLORS.bottom} />
        </LinearGradient>
        <RadialGradient id="glow" cx={w / 2} cy={glowY} rx={w * 0.6} ry={w * 0.6} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={LAUNCH_COLORS.teal} stopOpacity="0.28" />
          <Stop offset="1" stopColor={LAUNCH_COLORS.teal} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="sweepBottom" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={LAUNCH_COLORS.teal} stopOpacity="0.85" />
          <Stop offset="0.55" stopColor={LAUNCH_COLORS.green} stopOpacity="0.35" />
          <Stop offset="1" stopColor={LAUNCH_COLORS.green} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="sweepBottomSoft" x1="0" y1="1" x2="1" y2="0.3">
          <Stop offset="0" stopColor={LAUNCH_COLORS.teal} stopOpacity="0.35" />
          <Stop offset="1" stopColor={LAUNCH_COLORS.teal} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="sweepTop" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LAUNCH_COLORS.teal} stopOpacity="0.55" />
          <Stop offset="1" stopColor={LAUNCH_COLORS.teal} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={w} height={h} fill="url(#bg)" />
      <Rect x="0" y="0" width={w} height={h} fill="url(#glow)" />
      {/* Top-right corner sweep */}
      <Path d={`M ${w * 0.55} 0 C ${w * 0.8} ${h * 0.08}, ${w * 0.95} ${h * 0.2}, ${w} ${h * 0.3} L ${w} 0 Z`} fill="url(#sweepTop)" />
      {/* Bottom-left sweeps */}
      <Path
        d={`M 0 ${h * 0.55} C ${w * 0.35} ${h * 0.7}, ${w * 0.75} ${h * 0.82}, ${w} ${h} L 0 ${h} Z`}
        fill="url(#sweepBottomSoft)"
      />
      <Path
        d={`M 0 ${h * 0.72} C ${w * 0.25} ${h * 0.8}, ${w * 0.5} ${h * 0.9}, ${w * 0.68} ${h} L 0 ${h} Z`}
        fill="url(#sweepBottom)"
      />
    </Svg>
  );
}

const TRACK_WIDTH = 200;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: LAUNCH_COLORS.top },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.82)' },
  progressSlot: { height: 4, marginTop: spacing.xl },
  track: {
    width: TRACK_WIDTH,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  bar: { width: TRACK_WIDTH * 0.45, height: 4, borderRadius: radius.pill, backgroundColor: LAUNCH_COLORS.teal },
});
