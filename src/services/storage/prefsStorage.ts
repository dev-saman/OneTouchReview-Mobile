import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Non-sensitive, approved preferences only. Currently: the selected location.
 *
 * Never store here: tokens, passwords, codes, Google tokens, user/business
 * profiles or client data. Adding a field requires explicit approval.
 */

const KEY = 'otr.prefs.v1';

/** A location id, or "all" (location_id=all where the API allows it). */
export type LocationSelection = number | 'all';

export type Prefs = {
  selectedLocation: LocationSelection | null;
};

const DEFAULTS: Prefs = { selectedLocation: null };

const isSelection = (value: unknown): value is LocationSelection =>
  value === 'all' || (typeof value === 'number' && Number.isInteger(value) && value > 0);

/** Drops anything unexpected so a corrupt or older value can never crash startup. */
export function sanitizePrefs(raw: unknown): Prefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  const selected = (raw as { selectedLocation?: unknown }).selectedLocation;
  return { selectedLocation: isSelection(selected) ? selected : null };
}

export const prefsStorage = {
  async load(): Promise<Prefs> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? sanitizePrefs(JSON.parse(raw)) : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  },

  async setSelectedLocation(selectedLocation: LocationSelection | null): Promise<void> {
    const current = await this.load();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...current, selectedLocation }));
  },
};
