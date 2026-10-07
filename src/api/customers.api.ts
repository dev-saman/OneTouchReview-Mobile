import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { Customer, CustomersPage, ReviewRequestsPage, SendAttempt } from './types';

export type CustomerListQuery = {
  location: LocationSelection;
  search?: string;
  notSent?: boolean;
  cursor?: string | null;
};

/** Endpoints tab, rows "9 Clients". */
export const customersApi = {
  /** search, location_id, not_sent=1, cursor (next_cursor exactly as given). */
  list: ({ location, search, notSent, cursor }: CustomerListQuery, signal?: AbortSignal) =>
    network.get<CustomersPage>(Paths.customers, {
      signal,
      params: {
        location_id: location,
        search: search?.trim() || undefined,
        not_sent: notSent ? 1 : undefined,
        cursor: cursor ?? undefined,
      },
    }),

  get: async (id: number, signal?: AbortSignal) =>
    (await network.get<{ customer: Customer }>(Paths.customer(id), { signal })).customer,

  /** Why sends were refused. */
  sendAttempts: async (id: number, signal?: AbortSignal) =>
    (await network.get<{ attempts: SendAttempt[] }>(Paths.customerSendAttempts(id), { signal })).attempts,

  /** The client's request history, with follow-ups. */
  history: (id: number, cursor?: string | null, signal?: AbortSignal) =>
    network.get<ReviewRequestsPage>(Paths.reviewRequests, {
      signal,
      params: { customer_id: id, include_follow_ups: 1, cursor: cursor ?? undefined },
    }),
};
