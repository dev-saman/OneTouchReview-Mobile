import { EmptyState } from './States';

/** Development placeholder for tabs whose phase has not started yet. */
export function ComingLater({ feature }: { feature: string }) {
  return <EmptyState title={feature} message="Not available in this build yet." />;
}
