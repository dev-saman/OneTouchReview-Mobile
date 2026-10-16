import type { Role } from '@/api/types';

/**
 * What each role may see. Hide first; a server 403 FORBIDDEN is still authoritative
 * ("Ask the owner"). Source: build guide "Who uses it" and the Sheet notes.
 */
export type Capability =
  | 'resend' // Endpoints: "Resend link (owners, managers)"
  | 'askAi' // "Ask AI for owners and managers"
  | 'ownerReport' // /settings/owner-report/preview "Owners and managers"
  | 'accountNotifications' // bell kinds for owners and managers
  | 'businessCardAddress' // PUT /digital-cards/slug "Owners and managers"
  | 'managerDashboard' // Dashboard tab rows marked * and the Card assistant training (owners and managers)
  | 'manageReviews'; // site review replies, new review tags, AI summary refresh (Endpoints rows 73, 74, 77, 79)

const OWNER_AND_MANAGER: readonly Role[] = ['owner', 'manager'];

const RULES: Record<Capability, readonly Role[]> = {
  resend: OWNER_AND_MANAGER,
  askAi: OWNER_AND_MANAGER,
  ownerReport: OWNER_AND_MANAGER,
  accountNotifications: OWNER_AND_MANAGER,
  businessCardAddress: OWNER_AND_MANAGER,
  managerDashboard: OWNER_AND_MANAGER,
  manageReviews: OWNER_AND_MANAGER,
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  return !!role && RULES[capability].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
};
