import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { Customer, LeadSource, LeadsPage } from './types';

export type LeadsQuery = {
  location: LocationSelection;
  source?: LeadSource;
  /** Name, phone digits or email. */
  search?: string;
  cursor?: string | null;
};

export type AddLeadInput = {
  name: string;
  phone?: string;
  email?: string;
  locationId: number;
  /** Only when the person agreed to texts: never pre-ticked. Left out otherwise. */
  consentConfirmed?: boolean;
};

/** Endpoints tab, rows "16 Leads". Any role. Export is web only. */
export const leadsApi = {
  list: ({ location, source, search, cursor }: LeadsQuery, signal?: AbortSignal) =>
    network.get<LeadsPage>(Paths.leads, {
      signal,
      params: { location_id: location, source, q: search?.trim() || undefined, cursor: cursor ?? undefined },
    }),

  /** Same body and consent rules as adding a client. 409 ALREADY_CLIENT with details.customer_id. */
  addClient: async (id: string, input: AddLeadInput) => {
    const phone = input.phone?.trim();
    const email = input.email?.trim();
    return (
      await network.post<{ customer: Customer }>(Paths.leadAddClient(id), {
        name: input.name.trim(),
        phone: phone || undefined,
        email: email || undefined,
        location_id: input.locationId,
        // As adding a client: with a phone, consent exactly as ticked; email-only, no consent fields.
        ...(phone ? { consent_confirmed: input.consentConfirmed === true } : {}),
      })
    ).customer;
  },
};
