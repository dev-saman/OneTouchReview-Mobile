import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { isTransient } from '@/api/errors';
import type { ApiError } from '@/api/types';
import { colors, font, spacing } from '@/constants/theme';

import { Button } from './Button';
import type { IconName } from './IconTile';

export function LoadingView({ label }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={font.small}>{label}</Text> : null}
    </View>
  );
}

type ErrorStateProps = {
  error: ApiError;
  onRetry?: () => void;
  retrying?: boolean;
};

/** Shows the API's message. Offers Retry for transient failures (offline, timeout, 5xx). */
export function ErrorState({ error, onRetry, retrying }: ErrorStateProps) {
  const title =
    error.kind === 'offline' ? "You're offline" : error.kind === 'server' ? 'Something went wrong' : 'Unable to load';
  const canRetry = !!onRetry && (isTransient(error) || error.kind === 'rateLimited' || error.kind === 'unknown');
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <Text style={font.heading}>{title}</Text>
      <Text style={[font.small, styles.message]}>{error.message}</Text>
      {canRetry ? <Button title="Retry" onPress={onRetry} loading={retrying} variant="secondary" /> : null}
    </View>
  );
}

export function EmptyState({ title, message, icon }: { title: string; message?: string; icon?: IconName }) {
  return (
    <View style={styles.center}>
      {icon ? (
        <View style={styles.iconCircle} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Ionicons name={icon} size={36} color={colors.primary} />
        </View>
      ) : null}
      <Text style={font.heading}>{title}</Text>
      {message ? <Text style={[font.small, styles.message]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  message: { textAlign: 'center', maxWidth: 320 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
