import { PusherClient, RECONNECT_DELAYS, reverbUrl, type SocketLike } from '../pusherClient';

class FakeSocket implements SocketLike {
  sent: Record<string, unknown>[] = [];
  closedWith: number | undefined;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code?: number }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close(code?: number) {
    this.closedWith = code;
  }
  receive(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  established(socketId = '1.2', timeout = 30) {
    this.receive({ event: 'pusher:connection_established', data: JSON.stringify({ socket_id: socketId, activity_timeout: timeout }) });
  }
}

const flush = () => new Promise((resolve) => jest.requireActual<typeof globalThis>('timers').setImmediate(resolve));

function setup(authorize = jest.fn().mockResolvedValue('key:sig')) {
  const sockets: FakeSocket[] = [];
  const onEvent = jest.fn();
  const onConnectedChange = jest.fn();
  const client = new PusherClient({
    url: 'wss://example.test/app/key',
    authorize,
    onEvent,
    onConnectedChange,
    createSocket: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
  });
  return { client, sockets, onEvent, onConnectedChange, authorize };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('reverbUrl', () => {
  it('builds the Pusher protocol 7 URL from /app-config reverb', () => {
    expect(reverbUrl({ host: 'api.onetouchreview.com', port: 443, key: 'abc', scheme: 'https' })).toBe(
      'wss://api.onetouchreview.com:443/app/abc?protocol=7&client=js&version=8.4.0&flash=false',
    );
  });
});

describe('PusherClient', () => {
  it('authorises and subscribes the private channel once connected', async () => {
    const { client, sockets, authorize } = setup();
    client.subscribe('private-business.99.chats');
    client.connect();
    sockets[0].established('123.456');
    await flush();
    expect(authorize).toHaveBeenCalledWith('123.456', 'private-business.99.chats');
    expect(sockets[0].sent).toContainEqual({ event: 'pusher:subscribe', data: { channel: 'private-business.99.chats', auth: 'key:sig' } });
  });

  it('hands over chat events with their data parsed, and reports the connection', async () => {
    const { client, sockets, onEvent, onConnectedChange } = setup();
    client.subscribe('private-business.99.chats');
    client.connect();
    sockets[0].established();
    await flush();
    sockets[0].receive({ event: 'pusher_internal:subscription_succeeded', channel: 'private-business.99.chats', data: '{}' });
    expect(onConnectedChange).toHaveBeenCalledWith(true);
    sockets[0].receive({ event: 'chat.updated', channel: 'private-business.99.chats', data: JSON.stringify({ chat_id: 12 }) });
    expect(onEvent).toHaveBeenCalledWith('private-business.99.chats', 'chat.updated', { chat_id: 12 });
  });

  it('answers pings and pings after the activity timeout', () => {
    const { client, sockets } = setup();
    client.connect();
    sockets[0].established('1.2', 30);
    sockets[0].receive({ event: 'pusher:ping', data: '{}' });
    expect(sockets[0].sent).toContainEqual({ event: 'pusher:pong', data: {} });
    jest.advanceTimersByTime(30000);
    expect(sockets[0].sent).toContainEqual({ event: 'pusher:ping', data: {} });
  });

  it('reconnects with backoff after a dropped connection, not after disconnect()', () => {
    const { client, sockets } = setup();
    client.connect();
    sockets[0].onclose?.({ code: 1006 });
    jest.advanceTimersByTime(RECONNECT_DELAYS[0]);
    expect(sockets).toHaveLength(2);
    client.disconnect();
    sockets[1].onclose?.({ code: 1000 });
    jest.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(2);
  });

  it('does not reconnect when the server says not to (4000–4099)', () => {
    const { client, sockets } = setup();
    client.connect();
    sockets[0].onclose?.({ code: 4001 });
    jest.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1);
  });

  it('does not retry a refused channel until the next connection', async () => {
    const authorize = jest.fn().mockRejectedValue(new Error('403'));
    const { client, sockets } = setup(authorize);
    client.subscribe('private-business.99.chats');
    client.connect();
    sockets[0].established();
    await flush();
    client.subscribe('private-business.99.chats');
    await flush();
    expect(authorize).toHaveBeenCalledTimes(1);
    expect(sockets[0].sent.some((m) => m.event === 'pusher:subscribe')).toBe(false);
  });
});
