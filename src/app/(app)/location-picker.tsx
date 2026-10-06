import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing, touchTarget } from '@/constants/theme';
import { ALL_LOCATIONS_LABEL } from '@/features/location/selectors';
import { selectLocation } from '@/features/session/sessionThunks';
import type { LocationSelection } from '@/services/storage/prefsStorage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

type Row = { key: string; value: LocationSelection; label: string };

/** The choice is saved (AsyncStorage) and sent as location_id by location-scoped screens. */
export default function LocationPickerScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const locations = useAppSelector((s) => s.location.locations);
  const selected = useAppSelector((s) => s.location.selected);

  const rows: Row[] = [
    { key: 'all', value: 'all', label: ALL_LOCATIONS_LABEL },
    ...locations.map((l) => ({ key: String(l.id), value: l.id as LocationSelection, label: l.name })),
  ];

  const choose = async (value: LocationSelection) => {
    await dispatch(selectLocation(value));
    router.back();
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const active = item.value === selected;
        return (
          <Pressable
            onPress={() => choose(item.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.sm },
  row: {
    minHeight: touchTarget + 8,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.background },
  label: { fontSize: 16, color: colors.text },
  labelActive: { fontWeight: '600', color: colors.primary },
});
