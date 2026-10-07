import { network } from './network';
import { Paths } from './paths';
import type { EmailCodeResponse, ProfileUser } from './types';

type UserAnswer = { user: ProfileUser };

/** Endpoints tab, rows "1b Profile". Each change answers with the updated user. */
export const profileApi = {
  /** Code to confirm the current email. 409 ALREADY_VERIFIED. */
  sendEmailVerifyCode: () => network.post<EmailCodeResponse>(Paths.emailVerifyCode),

  /** Answer { user } with email_verified: true. Same 422 codes as sign-in. */
  verifyEmail: async (code: string) => (await network.post<UserAnswer>(Paths.emailVerify, { code })).user,

  /** Set or change. current_password only when user.has_password. Other devices stay signed in. */
  setPassword: async (input: { password: string; passwordConfirmation: string; currentPassword?: string }) =>
    (
      await network.put<UserAnswer>(Paths.password, {
        password: input.password,
        password_confirmation: input.passwordConfirmation,
        current_password: input.currentPassword,
      })
    ).user,

  /** Sign in with codes or Google only afterwards. */
  removePassword: async (currentPassword: string) =>
    (await network.delete<UserAnswer>(Paths.password, { body: { current_password: currentPassword } })).user,

  /** Hides "Set a password for faster sign-in" for 7 days. 204. */
  dismissPasswordReminder: () => network.post<void>(Paths.passwordReminderDismiss),

  /** Change email, step 1: code to the NEW address. 422 SAME_EMAIL; taken = VALIDATION_FAILED on email. */
  requestEmailChange: (email: string) => network.post<EmailCodeResponse>(Paths.profileEmailCode, { email }),

  /** Step 2: confirm with the code. Answer { user } with the new email, verified. 422 EMAIL_TAKEN. */
  confirmEmailChange: async (code: string) => (await network.post<UserAnswer>(Paths.profileEmail, { code })).user,
};
