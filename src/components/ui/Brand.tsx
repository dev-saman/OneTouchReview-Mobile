import { Image, StyleSheet } from 'react-native';

const MARK = require('../../../assets/images/brand-mark.png');
const LOGO = require('../../../assets/images/brand-logo.png');
const WORDMARK = require('../../../assets/images/brand-wordmark.png');
const WORDMARK_LIGHT = require('../../../assets/images/brand-wordmark-light.png');
const WORDMARK_WHITE = require('../../../assets/images/brand-wordmark-white.png');

/** The shield mark (512×474 source). */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={MARK}
      style={{ width: size, height: Math.round((size * 474) / 512) }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}

/** The full "OneTouchReview" logo (900×158 source). */
export function BrandLogo({ width = 240 }: { width?: number }) {
  return (
    <Image
      source={LOGO}
      style={[styles.logo, { width, height: Math.round((width * 158) / 900) }]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="OneTouchReview"
      accessibilityIgnoresInvertColors
    />
  );
}

/** "OneTouchReview" text only (900×96 source), for under a large mark. */
export function BrandWordmark({ width = 240 }: { width?: number }) {
  return (
    <Image
      source={WORDMARK}
      style={[styles.logo, { width, height: Math.round((width * 96) / 900) }]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="OneTouchReview"
      accessibilityIgnoresInvertColors
    />
  );
}

/**
 * For dark backgrounds: white "OneTouch" + teal "Review", or all white (`allWhite`) on teal,
 * where the teal half would disappear.
 */
export function BrandWordmarkLight({ width = 240, allWhite = false }: { width?: number; allWhite?: boolean }) {
  return (
    <Image
      source={allWhite ? WORDMARK_WHITE : WORDMARK_LIGHT}
      style={[styles.logo, { width, height: Math.round((width * 96) / 900) }]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="OneTouchReview"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center' },
});
