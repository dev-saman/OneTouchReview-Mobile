import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { prefsStorage, sanitizePrefs } from '../prefsStorage';
import { tokenStorage } from '../tokenStorage';

beforeEach(async () => {
  tokenStorage.__resetForTests();
  (jest.requireMock('expo-secure-store') as { __reset: () => void }).__reset();
  await AsyncStorage.clear();
});

describe('tokenStorage', () => {
  it('stores the token and expiry in SecureStore and restores them after a restart', async () => {
    await tokenStorage.save('tok', '2027-01-01T00:00:00Z');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('otr.auth.token', 'tok', expect.anything());

    tokenStorage.__resetForTests(); // simulate app restart: memory gone
    expect(tokenStorage.get()).toBeNull();
    expect(await tokenStorage.load()).toEqual({ token: 'tok', expiresAt: '2027-01-01T00:00:00Z' });
  });

  it('clear removes both keys', async () => {
    await tokenStorage.save('tok', '2027-01-01T00:00:00Z');
    await tokenStorage.clear();
    tokenStorage.__resetForTests();
    expect(await tokenStorage.load()).toBeNull();
  });

  it('never writes the token to AsyncStorage', async () => {
    await tokenStorage.save('secret-token', null);
    await prefsStorage.setSelectedLocation(1497);
    const keys = await AsyncStorage.getAllKeys();
    const values = await AsyncStorage.multiGet(keys);
    expect(JSON.stringify(values)).not.toContain('secret-token');
  });
});

describe('prefsStorage', () => {
  it('persists the selected location across restarts', async () => {
    await prefsStorage.setSelectedLocation(1498);
    expect(await prefsStorage.load()).toEqual({ selectedLocation: 1498 });
    await prefsStorage.setSelectedLocation('all');
    expect(await prefsStorage.load()).toEqual({ selectedLocation: 'all' });
  });

  it('ignores corrupt or unexpected values', async () => {
    await AsyncStorage.setItem('otr.prefs.v1', '{not json');
    expect(await prefsStorage.load()).toEqual({ selectedLocation: null });
    expect(sanitizePrefs({ selectedLocation: 'Austin', token: 'x' })).toEqual({ selectedLocation: null });
    expect(sanitizePrefs({ selectedLocation: -3 })).toEqual({ selectedLocation: null });
  });
});
