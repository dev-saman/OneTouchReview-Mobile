/**
 * A small Pusher-protocol (v7) client for Laravel Reverb on React Native's built-in WebSocket
 * (API-GAPS #2). It connects, authorises private channels through the app's API, answers pings,
 * and reconnects with backoff. Realtime is a bonus: the app keeps refreshing on focus without it.
 */

export type SocketLike = {
  send: (data: string) => void;
  close: (code?: number) => void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code?: number }) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

export type ReverbConfig = { host: string; port: number; key: string; scheme: string };

export type PusherOptions = {
  url: string;
  /** Returns the channel's auth string ("key:signature") from POST /broadcasting/auth. */
  authorize: (socketId: string, channel: string) => Promise<string>;
  onEvent: (channel: string, event: string, data: unknown) => void;
  /** Connected and subscribed, or not: screens may poll less while connected. */
  onConnectedChange?: (connected: boolean) => void;
  createSocket?: (url: string) => SocketLike;
};

/** Backoff between reconnects, in ms. */
export const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
/** How long to wait for pusher:pong after our ping. */
export const PONG_TIMEOUT = 30000;

export function reverbUrl(config: ReverbConfig): string {
  const secure = config.scheme !== 'http';
  return `${secure ? 'wss' : 'ws'}://${config.host}:${config.port}/app/${encodeURIComponent(config.key)}?protocol=7&client=js&version=8.4.0&flash=false`;
}

/** Pusher sends data as a JSON string inside the JSON message. */
function parseData(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

export class PusherClient {
  private socket: SocketLike | null = null;
  private socketId: string | null = null;
  private channels = new Set<string>();
  private subscribed = new Set<string>();
  /** Channels the API refused (401/403): not retried until the next connection. */
  private refused = new Set<string>();
  private wanted = false;
  private attempt = 0;
  private activityTimeout = 120;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: PusherOptions) {}

  get connected() {
    return this.socketId !== null && this.subscribed.size > 0;
  }

  subscribe(channel: string) {
    this.channels.add(channel);
    if (this.socketId) void this.authorizeAndSubscribe(channel);
  }

  connect() {
    this.wanted = true;
    if (this.socket || this.reconnectTimer) return;
    this.open();
  }

  /** Closes on purpose (sign-out, background): no reconnect. */
  disconnect() {
    this.wanted = false;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    this.reset();
    socket?.close(1000);
  }

  private open() {
    this.reconnectTimer = null;
    const create = this.options.createSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
    let socket: SocketLike;
    try {
      socket = create(this.options.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onmessage = (event) => this.handle(event.data);
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.reset();
      // 4000–4099: the server says don't reconnect (e.g. app key wrong, over capacity).
      const code = event?.code ?? 0;
      if (this.wanted && !(code >= 4000 && code < 4100)) this.scheduleReconnect();
    };
    socket.onerror = () => {
      // onclose follows and reconnects.
    };
  }

  private handle(raw: unknown) {
    this.touch();
    let message: { event?: string; channel?: string; data?: unknown };
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }
    const data = parseData(message.data);
    switch (message.event) {
      case 'pusher:connection_established': {
        const info = data as { socket_id?: string; activity_timeout?: number };
        if (typeof info?.socket_id !== 'string') return;
        this.socketId = info.socket_id;
        if (typeof info.activity_timeout === 'number' && info.activity_timeout > 0) this.activityTimeout = info.activity_timeout;
        this.attempt = 0;
        this.refused.clear();
        this.touch();
        for (const channel of this.channels) void this.authorizeAndSubscribe(channel);
        return;
      }
      case 'pusher:ping':
        this.send({ event: 'pusher:pong', data: {} });
        return;
      case 'pusher:pong':
        if (this.pongTimer) clearTimeout(this.pongTimer);
        this.pongTimer = null;
        return;
      case 'pusher_internal:subscription_succeeded':
        if (message.channel) {
          const before = this.connected;
          this.subscribed.add(message.channel);
          if (!before) this.options.onConnectedChange?.(true);
        }
        return;
      case 'pusher:error':
      case 'pusher:subscription_error':
        return;
      default:
        if (message.channel && message.event && !message.event.startsWith('pusher')) {
          this.options.onEvent(message.channel, message.event, data);
        }
    }
  }

  private async authorizeAndSubscribe(channel: string) {
    const socketId = this.socketId;
    if (!socketId || this.subscribed.has(channel) || this.refused.has(channel)) return;
    try {
      const auth = await this.options.authorize(socketId, channel);
      // The connection may have changed while we waited.
      if (this.socketId !== socketId) return;
      this.send({ event: 'pusher:subscribe', data: { channel, auth } });
    } catch {
      // Refused or offline: try again on the next connection.
      this.refused.add(channel);
    }
  }

  private send(message: object) {
    try {
      this.socket?.send(JSON.stringify(message));
    } catch {
      // A closing socket: onclose reconnects.
    }
  }

  /** Any message from the server: wait activity_timeout seconds before pinging. */
  private touch() {
    if (this.activityTimer) clearTimeout(this.activityTimer);
    if (!this.socket) return;
    this.activityTimer = setTimeout(() => {
      this.send({ event: 'pusher:ping', data: {} });
      this.pongTimer = setTimeout(() => this.socket?.close(4201), PONG_TIMEOUT);
    }, this.activityTimeout * 1000);
  }

  private scheduleReconnect() {
    if (!this.wanted || this.reconnectTimer) return;
    const delay = RECONNECT_DELAYS[Math.min(this.attempt, RECONNECT_DELAYS.length - 1)];
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private reset() {
    const wasConnected = this.connected;
    this.socketId = null;
    this.subscribed.clear();
    if (this.activityTimer) clearTimeout(this.activityTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.activityTimer = null;
    this.pongTimer = null;
    if (wasConnected) this.options.onConnectedChange?.(false);
  }

  private clearTimers() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
