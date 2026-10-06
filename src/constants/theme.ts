import { Platform } from 'react-native';

export const colors = {
  primary: '#1D4ED8',
  primaryPressed: '#1E40AF',
  onPrimary: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#94A3B8',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  danger: '#B91C1C',
  dangerSurface: '#FEF2F2',
  warning: '#B45309',
  warningSurface: '#FFFBEB',
  success: '#15803D',
  info: '#64748B',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

export const font = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  small: { fontSize: 14, color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textMuted },
};

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const touchTarget = Platform.OS === 'ios' ? 44 : 48;
