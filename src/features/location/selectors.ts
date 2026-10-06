import type { RootState } from '@/store/store';

export const ALL_LOCATIONS_LABEL = 'All locations';

export const selectSelectedLocation = (s: RootState) => s.location.selected;

export const selectLocationLabel = (s: RootState): string | null => {
  const { selected, locations } = s.location;
  if (selected === 'all') return ALL_LOCATIONS_LABEL;
  if (selected === null) return null;
  return locations.find((l) => l.id === selected)?.name ?? null;
};
