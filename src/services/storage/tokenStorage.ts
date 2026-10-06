import * as SecureStore from 'expo-secure-store';

/**
 * The bearer token and its expiry, in the iOS Keychain / Android Keystore.
 * This is the ONLY place the token is persisted. Never log the values.
 *
 * An in-memory copy avoids a keychain read on every request; it is filled by
 * `load()` during bootstrap and kept in sync by `save()` / `clear()`.
 */

const KEYS = {
  token: 'otr.auth.token',
  expiresAt: 'otr.auth.token_expires_at',
} as const;

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export type StoredToken = {
  token: string;
  /** token_expires_at exactly as the API sent it, or null if unknown. */
  expiresAt: string | null;
};

let cache: StoredToken | null = null;
let loaded = false;

export const tokenStorage = {
  /** Reads SecureStore once, then serves the memory copy. */
  async load(): Promise<StoredToken | null> {
    if (loaded) return cache;
    const [token, expiresAt] = await Promise.all([
      SecureStore.getItemAsync(KEYS.token, OPTIONS),
      SecureStore.getItemAsync(KEYS.expiresAt, OPTIONS),
    ]);
    cache = token ? { token, expiresAt: expiresAt || null } : null;
    loaded = true;
    return cache;
  },

  /** Synchronous memory copy (null before load() or when signed out). */
  get(): StoredToken | null {
    return cache;
  },

  /** Persists first, then swaps the memory copy, so a crash never leaves memory ahead of storage. */
  async save(token: string, expiresAt: string | null): Promise<void> {
    await SecureStore.setItemAsync(KEYS.token, token, OPTIONS);
    if (expiresAt) {
      await SecureStore.setItemAsync(KEYS.expiresAt, expiresAt, OPTIONS);
    } else {
      await SecureStore.deleteItemAsync(KEYS.expiresAt, OPTIONS);
    }
    cache = { token, expiresAt };
    loaded = true;
  },

  async clear(): Promise<void> {
    cache = null;
    loaded = true;
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.token, OPTIONS),
      SecureStore.deleteItemAsync(KEYS.expiresAt, OPTIONS),
    ]);
  },

  /** Tests only. */
  __resetForTests() {
    cache = null;
    loaded = false;
  },
};
