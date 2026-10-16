import { network } from './network';
import { Paths } from './paths';

/**
 * Endpoints row 66: Pusher-protocol channel auth for Reverb. Body socket_id and channel_name
 * (private-business.{id}.chats); allowed for members of that business. The answer is the
 * Pusher-protocol auth string.
 */
export const realtimeApi = {
  authorize: async (socketId: string, channel: string) => {
    const answer = await network.post<{ auth?: unknown }>(Paths.broadcastingAuth, { socket_id: socketId, channel_name: channel });
    if (typeof answer?.auth !== 'string') throw new Error('No channel auth in the answer');
    return answer.auth;
  },
};
