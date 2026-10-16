import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { Chips } from '@/components/ui/Chips';
import { colors, radius, spacing, touchTarget } from '@/constants/theme';

import { useReviewTags } from './hooks';

export function SearchBox({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search reviews"
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel="Search reviews"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
    </View>
  );
}

/** Filter by tag (tag_id). Hidden while the business has no tags. value: a tag id or null for all. */
export function TagFilter({ value, onChange }: { value: number | null; onChange: (tagId: number | null) => void }) {
  const { tags } = useReviewTags();
  if (!tags.length) return null;
  return (
    <Chips
      options={[{ value: 'all', label: 'All tags' }, ...tags.map((t) => ({ value: String(t.id), label: t.name }))]}
      value={value === null ? 'all' : String(value)}
      onChange={(v) => onChange(v === 'all' ? null : Number(v))}
    />
  );
}

export const listStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: { minHeight: touchTarget + 16, padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  header: { padding: spacing.lg, gap: spacing.lg },
  empty: { flexGrow: 1 },
});

const styles = StyleSheet.create({
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
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.sm },
});
