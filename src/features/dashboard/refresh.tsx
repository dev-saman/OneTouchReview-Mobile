import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type Refresher = () => Promise<void>;

const Registry = createContext<Set<Refresher> | null>(null);

/**
 * Pull to refresh reloads every tile: each tile registers its own refresh, so tiles keep showing
 * their data while they reload (and still load, fail and hide on their own).
 */
export function TileRefreshProvider({ children }: { children: (refreshAll: () => Promise<void>) => ReactNode }) {
  const [registry] = useState(() => new Set<Refresher>());
  const refreshAll = useCallback(async () => {
    await Promise.all([...registry].map((refresh) => refresh().catch(() => {})));
  }, [registry]);
  return <Registry.Provider value={registry}>{children(refreshAll)}</Registry.Provider>;
}

export function useTileRefresh(refresh: Refresher) {
  const registry = useContext(Registry);
  useEffect(() => {
    if (!registry) return;
    registry.add(refresh);
    return () => {
      registry.delete(refresh);
    };
  }, [registry, refresh]);
}
