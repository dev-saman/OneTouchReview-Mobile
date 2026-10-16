import { network } from './network';
import { Paths } from './paths';
import type { GoogleProfileChange, GoogleProfileChanges } from './types';

export type ApproveOptions = {
  /** Required for risk "careful" or "risky", after showing its warning. */
  confirmRisky?: boolean;
  /** Required when the change makes the hours 24/7. */
  confirm247?: boolean;
};

/**
 * Endpoints tab, rows "17 Google profile approvals". Any role reads (Pro: 403 PLAN_REQUIRED hides);
 * buttons only where change.can.* is true. Editing the profile is web only.
 * 409 WRONG_STATUS: already handled, refresh. 503 GOOGLE_PROFILE_EDITS_OFF: hide Approve.
 */
export const googleProfileApi = {
  changes: (locationId: number, cursor?: string | null, signal?: AbortSignal) =>
    network.get<GoogleProfileChanges>(Paths.googleProfileChanges(locationId), {
      signal,
      params: { cursor: cursor ?? undefined },
    }),

  approve: async (changeId: number, { confirmRisky, confirm247 }: ApproveOptions = {}) =>
    (
      await network.post<{ change: GoogleProfileChange }>(Paths.googleProfileChangeApprove(changeId), {
        via: 'mobile',
        ...(confirmRisky ? { confirm_risky: true } : {}),
        ...(confirm247 ? { confirm_24_7: true } : {}),
      })
    ).change,

  decline: async (changeId: number) =>
    (await network.post<{ change: GoogleProfileChange }>(Paths.googleProfileChangeDecline(changeId))).change,

  /** Within 30 days of going live: answers a new change waiting for approval (201). */
  undo: async (changeId: number) =>
    (await network.post<{ change: GoogleProfileChange }>(Paths.googleProfileChangeUndo(changeId))).change,
};
