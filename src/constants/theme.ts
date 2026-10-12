import { Platform } from 'react-native';

/** Brand colours come from the OneTouchReview logo (teal shield, green arrow, gold sparkles, navy wordmark). */
export const colors = {
  primary: '#018F7C',
  primaryPressed: '#01705F',
  /** Tinted backgrounds: selected chips, icon tiles, avatars. */
  primarySoft: '#E6F4F1',
  onPrimary: '#FFFFFF',
  accent: '#FBB10A',
  accentSoft: '#FEF5DC',
  text: '#0B1F3A',
  textMuted: '#4B5B70',
  textSubtle: '#94A3B8',
  background: '#F4F7F6',
  surface: '#FFFFFF',
  border: '#E3EAE8',
  danger: '#B91C1C',
  dangerSurface: '#FEF2F2',
  warning: '#B45309',
  warningSurface: '#FFFBEB',
  success: '#15803D',
  successSurface: '#F0FDF4',
  info: '#2563EB',
  infoSoft: '#EAF1FE',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Soft lift for cards on the tinted background. */
export const shadow = Platform.select({
  ios: { shadowColor: '#0B1F3A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  default: { elevation: 1 },
});

export const font = {
  title: { fontSize: 26, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  small: { fontSize: 14, color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textMuted },
};

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const touchTarget = Platform.OS === 'ios' ? 44 : 48;
