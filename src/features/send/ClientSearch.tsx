import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Customer } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { colors, font, radius, spacing, touchTarget } from '@/constants/theme';
import { useClientsList } from '@/features/clients/useClientsList';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { formatPhone } from '@/utils/format';

/** "Find a client": GET /customers?search= (name, phone or email). */
export function ClientSearch({ location, onPick }: { location: LocationSelection; onPick: (c: Customer) => void }) {
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim(), 350);
  const list = useClientsList(location, search, false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, phone or email"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Search clients"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
      </View>

      {list.loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : list.error ? (
        <View style={styles.message}>
          <Text style={font.small}>{list.error.message}</Text>
          <Button title="Try again" variant="text" onPress={list.reload} />
        </View>
      ) : list.items.length === 0 ? (
        <Text style={[font.small, styles.message]}>
          {search ? 'No matches. Add them as a new client instead.' : 'No clients yet. Add a new client.'}
        </Text>
      ) : (
        <View style={styles.results}>
          {list.items.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onPick(c)}
              accessibilityRole="button"
              accessibilityHint="Chooses this client"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={font.small}>{formatPhone(c.phone) || c.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
            </Pressable>
          ))}
          {list.hasMore ? (
            <Button title="Show more" variant="text" onPress={list.loadMore} loading={list.loadingMore} />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.sm },
  spinner: { padding: spacing.lg },
  message: { paddingVertical: spacing.sm },
  results: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.background },
  rowText: { flex: 1, gap: 2, paddingVertical: spacing.sm },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
});
