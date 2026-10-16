/** Moves one item up (-1) or down (+1); out-of-range moves leave the list as it is. */
export function move<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** YouTube or Vimeo links only (PUT /digital-cards/{id}/videos). */
export function isVideoLink(url: string): boolean {
  return /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(url.trim());
}

/** "182044" bytes → "178 KB". */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
