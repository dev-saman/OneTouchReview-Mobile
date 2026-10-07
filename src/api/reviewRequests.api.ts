import { network } from './network';
import { Paths } from './paths';
import type { NewClientInput, ReviewRequest, SendResult } from './types';

/** Endpoints tab, review request rows. */
export const reviewRequestsApi = {
  /** "Send to an existing client". channel auto: text when possible, else email. */
  send: (customerId: number, locationId: number) =>
    network.post<SendResult>(Paths.reviewRequests, { customer_id: customerId, location_id: locationId, channel: 'auto' }),

  /**
   * "Add a client and send". With a phone, consent_confirmed must be true (consent_method defaults to
   * in_person). With only an email, the consent fields are left out and it goes by email.
   */
  sendToNewClient: ({ name, phone, email, locationId, consentConfirmed }: NewClientInput) => {
    const hasPhone = !!phone?.trim();
    return network.post<SendResult>(Paths.reviewRequestsWithCustomer, {
      name: name.trim(),
      phone: hasPhone ? phone!.trim() : undefined,
      email: email?.trim() || undefined,
      location_id: locationId,
      channel: 'auto',
      ...(hasPhone ? { consent_confirmed: consentConfirmed === true } : {}),
    });
  },

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
