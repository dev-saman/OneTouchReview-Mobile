import type { Href } from 'expo-router';

/**
 * Push tab: data.deep_link is /chats/{id}, /feedback/{id} or /reviews/{id}. Only these exact
 * shapes are opened; anything else is ignored (never navigate to an arbitrary path from a push).
 */
export function hrefForDeepLink(link: unknown): Href | null {
  if (typeof link !== 'string') return null;
  const match = link.trim().match(/^\/(chats|feedback|reviews)\/(\d+)$/);
  if (!match) return null;
  const [, kind, id] = match;
  switch (kind) {
    case 'chats':
      return { pathname: '/chats/[id]', params: { id } };
    case 'feedback':
      // Push feedback comes from review requests (source=request, the default).
      return { pathname: '/feedback/[id]', params: { id, source: 'request' } };
    default:
      return { pathname: '/reviews/[id]', params: { id } };
  }
}
