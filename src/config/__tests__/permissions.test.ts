import { can } from '../permissions';

describe('role capabilities', () => {
  it('owners and managers can resend and use Ask AI', () => {
    for (const role of ['owner', 'manager'] as const) {
      expect(can(role, 'resend')).toBe(true);
      expect(can(role, 'askAi')).toBe(true);
      expect(can(role, 'ownerReport')).toBe(true);
      expect(can(role, 'accountNotifications')).toBe(true);
    }
  });

  it('staff cannot', () => {
    expect(can('staff', 'resend')).toBe(false);
    expect(can('staff', 'askAi')).toBe(false);
    expect(can('staff', 'ownerReport')).toBe(false);
    expect(can('staff', 'accountNotifications')).toBe(false);
  });

  it('no role → nothing', () => {
    expect(can(null, 'resend')).toBe(false);
  });
});
