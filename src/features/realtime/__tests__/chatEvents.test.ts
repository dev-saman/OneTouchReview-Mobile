import { chatChannel, chatEventFrom } from '../RealtimeProvider';

jest.mock('@/api/realtime.api', () => ({ realtimeApi: { authorize: jest.fn() } }));

describe('chat events', () => {
  it('uses the business chats channel', () => {
    expect(chatChannel(99)).toBe('private-business.99.chats');
  });

  it('reads chat.message and chat.updated with their chat id', () => {
    expect(chatEventFrom('chat.message', { chat_id: 12, message: { id: 1 } })).toEqual({ type: 'message', chatId: 12 });
    expect(chatEventFrom('chat.updated', { chat_id: '7' })).toEqual({ type: 'updated', chatId: 7 });
  });

  it('ignores other events and malformed data', () => {
    expect(chatEventFrom('chat.deleted', { chat_id: 1 })).toBeNull();
    expect(chatEventFrom('chat.updated', {})).toBeNull();
    expect(chatEventFrom('chat.updated', null)).toBeNull();
  });
});
