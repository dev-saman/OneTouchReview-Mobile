import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Customer } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, radius, spacing, touchTarget } from '@/constants/theme';
import { useClientsList } from '@/features/clients/useClientsList';
import { selectSelectedLocation } from '@/features/location/selectors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppSelector } from '@/store/hooks';
import { formatPhone, formatRating } from '@/utils/format';

/** Screen 9: search, Not sent filter, cursor paging; tap opens the client. */
export default function ClientsScreen() {
  const location = useAppSelector(selectSelectedLocation);
  if (location === null) {
    return <EmptyState title="No locations yet" message="Add a location on the web to see your clients here." />;
  }
  return <ClientsList location={location} />;
}

function ClientsList({ location }: { location: LocationSelection }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [notSent, setNotSent] = useState(false);
  const search = useDebouncedValue(query.trim(), 350);
  const list = useClientsList(location, search, notSent);
  useRefreshOnFocus(list.refresh);

  const empty = search
    ? { title: 'No matches', message: 'Try a different name, phone or email.' }
    : notSent
      ? { title: 'Nothing here', message: 'No clients with a request that was not sent.' }
      : { title: 'No clients yet', message: 'Clients appear here after you send them a review request.' };

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
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
            clearButtonMode="while-editing"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filters} accessibilityRole="tablist">
          <FilterChip label="All" active={!notSent} onPress={() => setNotSent(false)} />
          <FilterChip label="Not sent" active={notSent} onPress={() => setNotSent(true)} />
        </View>
      </View>

      {list.loading ? (
        <LoadingView />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => <ClientRow customer={item} onPress={() => router.push({ pathname: '/client/[id]', params: { id: String(item.id) } })} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={list.items.length ? undefined : styles.emptyContainer}
          ListEmptyComponent={<EmptyState title={empty.title} message={empty.message} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            list.loadingMore ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : list.moreError ? (
              <View style={styles.footer}>
                <Text style={[font.small, styles.center]}>{list.moreError.message}</Text>
                <Button title="Load more" variant="text" onPress={list.loadMore} />
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ClientRow({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const contact = formatPhone(customer.phone) || customer.email || '';
  const rating = customer.latest_response?.rating;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowMain}>
        <Text style={styles.name}>{customer.name}</Text>
        {contact ? <Text style={font.small}>{contact}</Text> : null}
        <View style={styles.rowMeta}>
          {customer.location ? <Text style={font.caption}>{customer.location.name}</Text> : null}
          {customer.last_not_sent ? <Badge label="Not sent" tone="warning" /> : null}
        </View>
      </View>
      {rating !== null && rating !== undefined ? (
        <View style={styles.rating} accessibilityLabel={`Rated ${formatRating(rating)} out of 5`}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={styles.ratingText}>{formatRating(rating)}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.sm },
  filters: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget + 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.background },
  rowMain: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 14, fontWeight: '600', color: colors.text },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  emptyContainer: { flexGrow: 1 },
  footer: { padding: spacing.lg, gap: spacing.sm },
  center: { textAlign: 'center' },
});
