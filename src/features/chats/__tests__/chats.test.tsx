import { act, renderHook } from '@testing-library/react-native';

import { chatsApi } from '@/api/chats.api';
import { makeError } from '@/api/errors';
import type { ChatMessage } from '@/api/types';

import { assignedName, chatTitle, preview, textOrNull } from '../format';
import { useOutbox } from '../useOutbox';

jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});
jest.mock('@/api/chats.api', () => ({ chatsApi: { send: jest.fn() } }));
const sendApi = chatsApi.send as jest.Mock;

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 2,
  from: 'business',
  body: 'Hi! Yes, we are open until 6pm.',
  sender_name: 'Ann',
  created_at: '2026-10-07T15:00:00Z',
  read_at: null,
  delivery: { status: 'logged', error_code: null },
  media_count: 0,
  hold_reason: null,
  ...over,
});

describe('chat format helpers', () => {
  it('names the chat from client, visitor name, phone, then email', () => {
    expect(chatTitle({ customer: { id: 1, name: 'Nina Park' }, visitor: null })).toBe('Nina Park');
    expect(chatTitle({ customer: null, visitor: { name: null, phone: '+15125550123', email: null } })).toBe('(512) 555-0123');
    expect(chatTitle({ customer: null, visitor: { name: null, phone: null, email: 'n@example.com' } })).toBe('n@example.com');
    expect(chatTitle({ customer: null, visitor: null })).toBe('Visitor');
  });

  it('shows assigned_to only when it is a name', () => {
    expect(assignedName(null)).toBeNull();
    expect(assignedName({ id: 1, name: 'Ann Smith' })).toBe('Ann Smith');
    expect(assignedName('Ann')).toBe('Ann');
    expect(assignedName({ id: 1 })).toBeNull();
  });

  it('previews the last message', () => {
    expect(preview(msg({ from: 'visitor', body: 'Open Saturday?' }))).toBe('Open Saturday?');
    expect(preview(msg({ body: 'Yes' }))).toBe('You: Yes');
    expect(preview(msg({ from: 'visitor', body: null, media_count: 2 }))).toBe('2 attachments');
    expect(preview(null)).toBe('');
  });

  it('textOrNull ignores non-text values', () => {
    expect(textOrNull({ code: 'x' })).toBeNull();
    expect(textOrNull(' Blocked ')).toBe('Blocked');
  });
});

describe('useOutbox', () => {
  beforeEach(() => sendApi.mockReset());

  it('sends with a client_id and hands the message over', async () => {
    const sent = msg();
    sendApi.mockResolvedValue(sent);
    const onSent = jest.fn();
    const { result } = await renderHook(() => useOutbox(1, onSent));
    await act(async () => {
      await result.current.send('Hi');
    });
    expect(sendApi).toHaveBeenCalledWith(1, 'Hi', expect.stringMatching(/^uuid-/));
    expect(onSent).toHaveBeenCalledWith(sent);
    expect(result.current.outbox).toEqual([]);
  });

  it('keeps a failed message and retries it with the same client_id', async () => {
    sendApi.mockRejectedValueOnce(makeError('timeout')).mockResolvedValueOnce(msg());
    const { result } = await renderHook(() => useOutbox(1, jest.fn()));
    await act(async () => {
      await result.current.send('Hi');
    });
    expect(result.current.outbox).toMatchObject([{ body: 'Hi', state: 'failed' }]);
    const clientId = result.current.outbox[0].clientId;
    await act(async () => {
      result.current.retry(clientId);
    });
    expect(sendApi.mock.calls[1][2]).toBe(clientId);
    expect(result.current.outbox).toEqual([]);
  });

  it('gives each new message its own client_id', async () => {
    sendApi.mockResolvedValue(msg());
    const { result } = await renderHook(() => useOutbox(1, jest.fn()));
    await act(async () => {
      await result.current.send('One');
      await result.current.send('Two');
    });
    expect(sendApi.mock.calls[0][2]).not.toBe(sendApi.mock.calls[1][2]);
  });
});
