import { tokenStorage } from '@/services/storage/tokenStorage';

import { mockHttp } from '../../../../tests/httpMock';
import { registerDevice, resetDeviceRegistration } from '../registerDevice';

const devicePosts = (calls: { method?: string; url?: string }[]) =>
  calls.filter((c) => c.method === 'post' && c.url === '/devices');

describe('registerDevice', () => {
  beforeEach(async () => {
    resetDeviceRegistration();
    tokenStorage.__resetForTests();
    await tokenStorage.save('tok', new Date(Date.now() + 80 * 86_400_000).toISOString());
  });

  it('sends one POST /devices when the same token arrives twice at once', async () => {
    const calls = mockHttp(() => ({ status: 201, data: { device: { id: 1 } } }));
    await Promise.all([registerDevice('token-a'), registerDevice('token-a')]);
    expect(devicePosts(calls)).toHaveLength(1);
  });

  it('registers again when the token changes', async () => {
    const calls = mockHttp(() => ({ status: 201, data: { device: { id: 1 } } }));
    await registerDevice('token-a');
    await registerDevice('token-b');
    expect(devicePosts(calls)).toHaveLength(2);
  });

  it('retries the same token after a failure', async () => {
    let fail = true;
    const calls = mockHttp(() => (fail ? { status: 500 } : { status: 201, data: { device: { id: 1 } } }));
    await registerDevice('token-a');
    fail = false;
    await registerDevice('token-a');
    expect(devicePosts(calls)).toHaveLength(2);
  });

  it('registers again after sign-out resets it', async () => {
    const calls = mockHttp(() => ({ status: 201, data: { device: { id: 1 } } }));
    await registerDevice('token-a');
    resetDeviceRegistration();
    await registerDevice('token-a');
    expect(devicePosts(calls)).toHaveLength(2);
  });
});
