/**
 * Signals from the network layer to the store, without the network layer
 * importing the store (which would create a cycle).
 */

type Events = {
  /** Any 401 on an authenticated call. The token has already been removed. */
  unauthorized: undefined;
  /** 403 BUSINESS_SUSPENDED. Carries the API's message. */
  suspended: { message: string };
};

type Listener<T> = (payload: T) => void;

const listeners = new Map<keyof Events, Set<Listener<never>>>();

export const sessionEvents = {
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = listeners.get(event) ?? new Set<Listener<never>>();
    listeners.set(event, set);
    set.add(listener as Listener<never>);
    return () => {
      set.delete(listener as Listener<never>);
    };
  },

  emit<K extends keyof Events>(event: K, ...[payload]: Events[K] extends undefined ? [] : [Events[K]]) {
    listeners.get(event)?.forEach((listener) => (listener as Listener<Events[K]>)(payload as Events[K]));
  },
};
