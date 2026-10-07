import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, touchTarget } from '@/constants/theme';

import { useNotificationBadge } from './BadgeProvider';
import { badgeLabel } from './target';

/** Header bell with the unread count. Hidden when the API has no bell (404). */
export function BellButton() {
  const router = useRouter();
  const { count, available } = useNotificationBadge();
  if (!available) return null;

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={count ? `Notifications, ${count} unread` : 'Notifications'}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={6}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onPrimary, fontSize: 11, fontWeight: '700' },
});
