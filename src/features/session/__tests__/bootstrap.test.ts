import AsyncStorage from '@react-native-async-storage/async-storage';

import { locationsApi } from '@/api/locations.api';
import type { User } from '@/api/types';
import { __testing, network } from '@/api/network';
import { prefsStorage } from '@/services/storage/prefsStorage';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { attachSessionListeners } from '@/store/sessionListeners';
import { createAppStore } from '@/store/store';

import { mockHttp, type MockReply } from '../../../../tests/httpMock';
import { completeSignIn, runBootstrap, signOut } from '../sessionThunks';

// GET /locations is mapped once a real response is captured; its parsing is not under test here.
jest.mock('@/api/locations.api', () => ({ locationsApi: { list: jest.fn() } }));

const AUSTIN = { id: 1497, name: 'Austin' };
const DALLAS = { id: 1498, name: 'Dallas' };
const DAY = 24 * 60 * 60 * 1000;
const inDays = (d: number) => new Date(Date.now() + d * DAY).toISOString();

const APP_CONFIG = {
  min_app_version: { ios: '1.0.0', android: '1.0.0' },
  latest_app_version: { ios: '1.0.0', android: '1.0.0' },
  store_urls: { ios: null, android: null },
  reverb: { host: 'api.onetouchreview.com', port: 443, key: 'k', scheme: 'https' },
  firebase_enabled: true,
};
const ME = {
  user: { role: 'owner', email_verified: true, has_password: true, google_linked: false, show_password_reminder: false },
  business: { id: 99 },
};

function setup(routes: Record<string, MockReply>) {
  const store = createAppStore();
  const detach = attachSessionListeners(store);
  const calls = mockHttp((config) => routes[config.url ?? ''] ?? { status: 404, data: {} });
  return { store, detach, calls };
}

beforeEach(async () => {
  __testing.reset();
  tokenStorage.__resetForTests();
  (jest.requireMock('expo-secure-store') as { __reset: () => void }).__reset();
  await AsyncStorage.clear();
  (locationsApi.list as jest.Mock).mockResolvedValue([AUSTIN, DALLAS]);
});

describe('runBootstrap', () => {
  it('no token → signed out (no flash of the app)', async () => {
    const { store, detach } = setup({ '/app-config': { status: 200, data: APP_CONFIG } });
    expect(store.getState().session.phase).toBe('booting');
    await store.dispatch(runBootstrap());
    expect(store.getState().session.phase).toBe('signedOut');
    detach();
  });

  it('valid token → /auth/me → locations → signed in, restoring the saved location', async () => {
    await tokenStorage.save('tok', inDays(80));
    await prefsStorage.setSelectedLocation(1498);
    tokenStorage.__resetForTests(); // cold start
    const { store, detach } = setup({
      '/app-config': { status: 200, data: APP_CONFIG },
      '/auth/me': { status: 200, data: ME },
    });
    await store.dispatch(runBootstrap());
    const state = store.getState();
    expect(state.session.phase).toBe('signedIn');
    expect(state.auth.user?.role).toBe('owner');
    expect(state.location.selected).toBe(1498);
    detach();
  });

  it('below min_app_version → blocking update screen, nothing else loads', async () => {
    await tokenStorage.save('tok', inDays(80));
    const { store, detach, calls } = setup({
      '/app-config': { status: 200, data: { ...APP_CONFIG, min_app_version: { ios: '2.0.0', android: '2.0.0' } } },
    });
    await store.dispatch(runBootstrap());
    expect(store.getState().session.phase).toBe('updateRequired');
    expect(calls.map((c) => c.url)).toEqual(['/app-config']);
    detach();
  });

  it('/app-config unreachable → Retry screen; no cached config; token kept', async () => {
    await tokenStorage.save('tok', inDays(80));
    const { store, detach } = setup({ '/app-config': 'network-error' });
    await store.dispatch(runBootstrap());
    expect(store.getState().session.phase).toBe('startupError');
    expect(store.getState().appConfig.config).toBeNull();
    expect(tokenStorage.get()?.token).toBe('tok');
    detach();
  });

  it('/auth/me 5xx on a cold start → Retry screen, token kept, no cached identity', async () => {
    await tokenStorage.save('tok', inDays(80));
    const { store, detach } = setup({
      '/app-config': { status: 200, data: APP_CONFIG },
      '/auth/me': { status: 500, data: {} },
    });
    await store.dispatch(runBootstrap());
    expect(store.getState().session.phase).toBe('startupError');
    expect(store.getState().auth.user).toBeNull();
    expect(tokenStorage.get()?.token).toBe('tok');
    detach();
  });

  it('/auth/me 401 → token removed and signed out', async () => {
    await tokenStorage.save('tok', inDays(80));
    const { store, detach } = setup({
      '/app-config': { status: 200, data: APP_CONFIG },
      '/auth/me': { status: 401, data: {} },
    });
    await store.dispatch(runBootstrap());
    expect(store.getState().session.phase).toBe('signedOut');
    tokenStorage.__resetForTests();
    expect(await tokenStorage.load()).toBeNull();
    detach();
  });

  it('refreshes on start when fewer than 30 days remain', async () => {
    await tokenStorage.save('old', inDays(10));
    const { store, detach, calls } = setup({
      '/app-config': { status: 200, data: APP_CONFIG },
      '/auth/refresh': { status: 200, data: { token: 'new', token_expires_at: inDays(90) } },
      '/auth/me': { status: 200, data: ME },
    });
    await store.dispatch(runBootstrap());
    expect(calls.map((c) => c.url)).toEqual(['/app-config', '/auth/refresh', '/auth/me']);
    expect(tokenStorage.get()?.token).toBe('new');
    expect(store.getState().session.phase).toBe('signedIn');
    detach();
  });
});

describe('after a successful start', () => {
  it('losing connectivity later does not sign the user out', async () => {
    await tokenStorage.save('tok', inDays(80));
    const { store, detach } = setup({
      '/app-config': { status: 200, data: APP_CONFIG },
      '/auth/me': { status: 200, data: ME },
    });
    await store.dispatch(runBootstrap());
    mockHttp(() => 'network-error');
    await expect(network.get('/customers')).rejects.toMatchObject({ kind: 'network' });
    expect(store.getState().session.phase).toBe('signedIn');
    expect(tokenStorage.get()?.token).toBe('tok');
    detach();
  });

  it('a 401 on any later call returns to sign-in', async () => {
    await tokenStorage.save('tok', inDays(80));
    const { store, detach } = setup({
      '/app-config': { status: 200, data: APP_CONFIG },
      '/auth/me': { status: 200, data: ME },
    });
    await store.dispatch(runBootstrap());
    mockHttp(() => ({ status: 401, data: {} }));
    await expect(network.get('/customers')).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(store.getState().session.phase).toBe('signedOut');
    expect(store.getState().auth.user).toBeNull();
    detach();
  });
});

describe('sign in / out', () => {
  it('completeSignIn stores the token in SecureStore and enters the app', async () => {
    const { store, detach } = setup({});
    await store.dispatch(
      completeSignIn({ token: 'tok', token_expires_at: inDays(90), user: ME.user as User, business: ME.business }),
    );
    expect(store.getState().session.phase).toBe('signedIn');
    tokenStorage.__resetForTests();
    expect((await tokenStorage.load())?.token).toBe('tok');
    detach();
  });

  it('signOut calls /auth/logout and clears the token, even when offline', async () => {
    await tokenStorage.save('tok', inDays(80));
    const { store, detach, calls } = setup({ '/auth/logout': 'network-error' });
    await store.dispatch(signOut());
    expect(calls.map((c) => c.url)).toEqual(['/auth/logout']);
    expect(store.getState().session.phase).toBe('signedOut');
    expect(tokenStorage.get()).toBeNull();
    detach();
  });
});
