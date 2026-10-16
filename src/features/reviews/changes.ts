import type { ReviewChangeKind } from '@/api/types';

/** Plain words for a Google review change (row 69: edited, removed from Google, back again). */
export function changeLabel(kind: ReviewChangeKind, oldRating: number | null, newRating: number | null): string {
  switch (kind) {
    case 'edited':
      return oldRating && newRating && oldRating !== newRating ? `Edited: ${oldRating}★ → ${newRating}★` : 'Edited';
    case 'removed':
      return 'Removed from Google';
    case 'restored':
      return 'Back on Google';
    default:
      return 'Changed';
  }
}
