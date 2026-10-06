import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { __testing } from '@/api/network';

export type MockReply = { status: number; data?: unknown; headers?: Record<string, string> } | 'network-error';

export type Handler = (config: InternalAxiosRequestConfig) => MockReply | Promise<MockReply>;

/** Replaces the axios transport of the real network client. Returns the recorded requests. */
export function mockHttp(handler: Handler) {
  const calls: InternalAxiosRequestConfig[] = [];
  __testing.client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push(config);
    const reply = await handler(config);
    if (reply === 'network-error') {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    }
    const response = {
      data: reply.data,
      status: reply.status,
      statusText: String(reply.status),
      headers: new AxiosHeaders(reply.headers ?? {}),
      config,
    };
    if (reply.status >= 200 && reply.status < 300) return response;
    throw new AxiosError(`Request failed with status code ${reply.status}`, 'ERR_BAD_RESPONSE', config, null, response);
  };
  return calls;
}

export const authHeader = (config: InternalAxiosRequestConfig) =>
  (config.headers as AxiosHeaders).get('Authorization') as string | undefined;
