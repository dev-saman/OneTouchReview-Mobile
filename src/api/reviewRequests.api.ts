import { network } from './network';
import { Paths } from './paths';
import type { ReviewRequest } from './types';

/** Endpoints tab, review request rows. */
export const reviewRequestsApi = {
  /**
   * "Resend link (owners, managers)". Only when can_resend is true; max 2 per request.
   * 201 with the new follow-up request. `clientId` (uuid) is reused when retrying the same resend,
   * so a retry after a lost answer never sends twice.
   */
  resend: async (id: number, clientId: string) =>
    (
      await network.post<{ review_request: ReviewRequest }>(Paths.reviewRequestResend(id), {
        confirmed: true,
        client_id: clientId,
      })
    ).review_request,
};
