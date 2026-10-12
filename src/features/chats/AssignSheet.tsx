import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { chatsApi } from '@/api/chats.api';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/States';
import { ROLE_LABELS } from '@/config/permissions';
import { colors, font, radius, spacing, touchTarget } from '@/constants/theme';
import { useApiQuery } from '@/hooks/useApiQuery';

type Props = {
  visible: boolean;
  currentId: number | null;
  onPick: (userId: number | null) => void;
  onClose: () => void;
};

/** Bottom sheet listing GET /chat-team, plus "Not assigned". */
export function AssignSheet({ visible, currentId, onPick, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.header}>
          <Text style={font.heading} accessibilityRole="header">
            Assign chat
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        {visible ? <TeamList currentId={currentId} onPick={onPick} /> : null}
      </SafeAreaView>
    </Modal>
  );
}

function TeamList({ currentId, onPick }: { currentId: number | null; onPick: (userId: number | null) => void }) {
  const fetcher = useCallback((signal: AbortSignal) => chatsApi.team(signal), []);
  const { data, error, loading, reload } = useApiQuery('chat-team', fetcher);

  if (loading) return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Option label="Not assigned" selected={currentId === null} onPress={() => onPick(null)} />
      {data.map((user) => (
        <Option
          key={user.id}
          label={user.name}
          note={user.role in ROLE_LABELS ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] : undefined}
          avatar
          selected={user.id === currentId}
          onPress={() => onPick(user.id)}
        />
      ))}
    </ScrollView>
  );
}

function Option({
  label,
  note,
  avatar,
  selected,
  onPress,
}: {
  label: string;
  note?: string;
  avatar?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      {avatar ? (
        <Avatar name={label} size={36} />
      ) : (
        <View style={styles.noneIcon}>
          <Ionicons name="person-remove-outline" size={18} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.optionText}>
        <Text style={font.body}>{label}</Text>
        {note ? <Text style={font.caption}>{note}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,31,58,0.35)' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  loading: { padding: spacing.xl },
  list: { paddingVertical: spacing.sm },
  option: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: colors.background },
  noneIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  optionText: { flex: 1, gap: 2 },
});
