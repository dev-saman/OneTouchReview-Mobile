import { tokenStorage } from '@/services/storage/tokenStorage';

import { mockHttp } from '../../../tests/httpMock';
import { chatsApi } from '../chats.api';

beforeEach(async () => {
  tokenStorage.__resetForTests();
  await tokenStorage.save('tok', new Date(Date.now() + 80 * 86_400_000).toISOString());
});

describe('chatsApi assign', () => {
  it('sends assigned_user_id, and null to unassign', async () => {
    const calls = mockHttp((config) => ({
      status: 200,
      data: { chat: { id: 7, assigned_to: JSON.parse(config.data).assigned_user_id ? { id: 3, name: 'Ann Smith' } : null } },
    }));
    expect((await chatsApi.assign(7, 3)).assigned_to).toEqual({ id: 3, name: 'Ann Smith' });
    expect((await chatsApi.assign(7, null)).assigned_to).toBeNull();
    expect(calls.map((c) => [c.method, c.url, JSON.parse(c.data)])).toEqual([
      ['patch', '/chats/7', { assigned_user_id: 3 }],
      ['patch', '/chats/7', { assigned_user_id: null }],
    ]);
  });

  it('lists the chat team', async () => {
    mockHttp(() => ({ status: 200, data: { users: [{ id: 1, name: 'Ann Smith', role: 'owner' }] } }));
    expect(await chatsApi.team()).toEqual([{ id: 1, name: 'Ann Smith', role: 'owner' }]);
  });
});
