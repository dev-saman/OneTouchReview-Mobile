import type { Role } from '@/api/types';

/**
 * What each role may see. Hide first; a server 403 FORBIDDEN is still authoritative
 * ("Ask the owner"). Source: build guide "Who uses it" and the Sheet notes.
 */
export type Capability =
  | 'resend' // Endpoints: "Resend link (owners, managers)"
  | 'askAi' // "Ask AI for owners and managers"
  | 'ownerReport' // /settings/owner-report/preview "Owners and managers"
  | 'accountNotifications'; // bell kinds for owners and managers

const OWNER_AND_MANAGER: readonly Role[] = ['owner', 'manager'];

const RULES: Record<Capability, readonly Role[]> = {
  resend: OWNER_AND_MANAGER,
  askAi: OWNER_AND_MANAGER,
  ownerReport: OWNER_AND_MANAGER,
  accountNotifications: OWNER_AND_MANAGER,
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  return !!role && RULES[capability].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
};
