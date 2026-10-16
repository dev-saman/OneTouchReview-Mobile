import type { GoogleProfileChange } from '@/api/types';

/** Approving a "careful" or "risky" change needs its warning first, then confirm_risky: true. */
export const needsRiskConfirm = (change: Pick<GoogleProfileChange, 'risk'>) => change.risk === 'careful' || change.risk === 'risky';

export function riskWarning(change: Pick<GoogleProfileChange, 'risk' | 'field_label'>): string {
  return change.risk === 'risky'
    ? `Changing the ${change.field_label.toLowerCase()} can change how Google shows and ranks your business. Approve only if you’re sure.`
    : `Please check the new ${change.field_label.toLowerCase()} carefully before it goes to Google.`;
}

/**
 * confirm_24_7: true "when the change makes the hours 24/7". The change object has no flag for it
 * (docs/API-GAPS.md #31), so the app asks when an hours change reads as open around the clock.
 */
export function makesHours247(change: Pick<GoogleProfileChange, 'field' | 'field_label' | 'after_text'>): boolean {
  const isHours = /hours/i.test(change.field ?? '') || /hours/i.test(change.field_label);
  return isHours && /24\s*\/\s*7|24\s*hours|open\s*24/i.test(change.after_text ?? '');
}

/** The change a push or the bell named goes on top of its group. */
export function changeFirst<T extends { id: number }>(list: T[], changeId: number | null): T[] {
  if (!changeId) return list;
  const hit = list.filter((c) => c.id === changeId);
  return hit.length ? [...hit, ...list.filter((c) => c.id !== changeId)] : list;
}
