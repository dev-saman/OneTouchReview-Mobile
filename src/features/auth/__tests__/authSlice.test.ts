import type { Business, User } from '@/api/types';

import { sessionActions } from '../../session/sessionSlice';
import { authActions, authReducer } from '../authSlice';

const USER: User = {
  name: 'Ann Smith',
  email: 'owner@example.com',
  role: 'owner',
  email_verified: false,
  has_password: false,
  google_linked: false,
  show_password_reminder: true,
};
const BUSINESS: Business = { id: 99 };

describe('authSlice profileUpdated', () => {
  it('merges a profile answer and keeps the role from /auth/me', () => {
    let state = authReducer(undefined, authActions.identityLoaded({ user: USER, business: BUSINESS }));
    // Profile answers have no role.
    const { role: _role, ...profileUser } = { ...USER, email: 'new@example.com', email_verified: true };
    state = authReducer(state, authActions.profileUpdated(profileUser));
    expect(state.user).toMatchObject({ email: 'new@example.com', email_verified: true, role: 'owner' });
  });

  it('applies a partial change (reminder dismissed)', () => {
    let state = authReducer(undefined, authActions.identityLoaded({ user: USER, business: BUSINESS }));
    state = authReducer(state, authActions.profileUpdated({ show_password_reminder: false }));
    expect(state.user?.show_password_reminder).toBe(false);
    expect(state.user?.has_password).toBe(false);
  });

  it('ignores a profile answer after sign-out', () => {
    let state = authReducer(undefined, authActions.identityLoaded({ user: USER, business: BUSINESS }));
    state = authReducer(state, sessionActions.signedOut());
    state = authReducer(state, authActions.profileUpdated({ email_verified: true }));
    expect(state.user).toBeNull();
  });
});
