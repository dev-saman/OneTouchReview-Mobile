import { act, renderHook } from '@testing-library/react-native';

import { makeError } from '@/api/errors';
import { reviewRequestsApi } from '@/api/reviewRequests.api';

import { useResend, type ResendOutcome } from '../useResend';

jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});

jest.mock('@/api/reviewRequests.api', () => ({ reviewRequestsApi: { resend: jest.fn() } }));
const resendApi = reviewRequestsApi.resend as jest.Mock;

const SENT = { id: 9, status: 'sent', is_reminder: true };

beforeEach(() => resendApi.mockReset());

async function resend(result: { current: ReturnType<typeof useResend> }, id: number): Promise<ResendOutcome> {
  let outcome: ResendOutcome | undefined;
  await act(async () => {
    outcome = await result.current.resend(id);
  });
  return outcome!;
}

describe('useResend', () => {
  it('sends a fresh client_id and returns the new request', async () => {
    resendApi.mockResolvedValue(SENT);
    const { result } = await renderHook(() => useResend());
    const outcome = await resend(result, 1);
    expect(outcome).toEqual({ ok: true, request: SENT });
    expect(resendApi).toHaveBeenCalledWith(1, expect.stringMatching(/^uuid-/));
    expect(result.current.pendingId).toBeNull();
  });

  it('reuses the client_id when retrying after a timeout', async () => {
    resendApi.mockRejectedValueOnce(makeError('timeout')).mockResolvedValueOnce(SENT);
    const { result } = await renderHook(() => useResend());
    const first = await resend(result, 1);
    expect(first.ok).toBe(false);
    await resend(result, 1);
    expect(resendApi.mock.calls[0][1]).toBe(resendApi.mock.calls[1][1]);
  });

  it('uses a new client_id after the server refuses', async () => {
    resendApi
      .mockRejectedValueOnce(makeError('rejected', { status: 422, code: 'RESEND_LIMIT_REACHED' }))
      .mockResolvedValueOnce(SENT);
    const { result } = await renderHook(() => useResend());
    const first = await resend(result, 1);
    expect(first).toMatchObject({ ok: false, error: { code: 'RESEND_LIMIT_REACHED' } });
    await resend(result, 1);
    expect(resendApi.mock.calls[0][1]).not.toBe(resendApi.mock.calls[1][1]);
  });

  it('uses a new client_id after a success', async () => {
    resendApi.mockResolvedValue(SENT);
    const { result } = await renderHook(() => useResend());
    await resend(result, 1);
    await resend(result, 1);
    expect(resendApi.mock.calls[0][1]).not.toBe(resendApi.mock.calls[1][1]);
  });
});
