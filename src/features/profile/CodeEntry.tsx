import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ApiError, EmailCodeResponse } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { CODE_LENGTH, CodeInput } from '@/components/ui/CodeInput';
import { colors, font, spacing } from '@/constants/theme';
import { toApiError } from '@/hooks/useApiQuery';
import { useCountdown } from '@/hooks/useCountdown';

/** Errors tab: these codes mean the current code can no longer work → offer a new one. */
const NEEDS_NEW_CODE = new Set(['CODE_EXPIRED', 'TOO_MANY_ATTEMPTS', 'INVALID_LINK']);

type Props = {
  /** The answer that sent the first code (masked address, expiry, resend wait). */
  sent: EmailCodeResponse;
  resend: () => Promise<EmailCodeResponse>;
  /** Throws an ApiError when the code is refused. */
  verify: (code: string) => Promise<void>;
  submitLabel: string;
  /** Return true when the screen handled the error itself (e.g. EMAIL_TAKEN → back to step 1). */
  onVerifyError?: (error: ApiError) => boolean;
};

/** 6-digit code entry for profile changes: tries left, "Send a new code", resend timer. */
export function CodeEntry({ sent, resend, verify, submitLabel, onVerifyError }: Props) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [current, setCurrent] = useState(sent);
  const [notice, setNotice] = useState<string | null>(null);
  const countdown = useCountdown(sent.resend_after);

  const submit = async (value: string) => {
    if (verifying || value.length !== CODE_LENGTH) return;
    setVerifying(true);
    setError(null);
    setNotice(null);
    try {
      await verify(value);
    } catch (e) {
      const apiError = toApiError(e);
      setCode('');
      if (!onVerifyError?.(apiError)) setError(apiError);
    } finally {
      setVerifying(false);
    }
  };

  const sendNew = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const answer = await resend();
      setCurrent(answer);
      countdown.start(answer.resend_after);
      setCode('');
      setNotice(`We sent a new code to ${answer.email_masked}.`);
    } catch (e) {
      const apiError = toApiError(e);
      if (apiError.retryAfterSeconds) countdown.start(apiError.retryAfterSeconds);
      setError(apiError);
    } finally {
      setResending(false);
    }
  };

  const attemptsLeft =
    error?.code === 'INVALID_CODE' && typeof error.details?.attempts_left === 'number'
      ? (error.details.attempts_left as number)
      : null;
  const mustRequestNew = !!error?.code && NEEDS_NEW_CODE.has(error.code);
  const minutes = Math.max(1, Math.round(current.expires_in / 60));

  return (
    <View style={styles.wrapper}>
      <Text style={font.small}>
        We emailed a 6-digit code to {current.email_masked}. It works for {minutes} minutes.
      </Text>

      <CodeInput value={code} onChange={setCode} onComplete={submit} error={!!error} editable={!verifying && !mustRequestNew} />

      {error ? (
        <View style={styles.messages} accessibilityLiveRegion="polite">
          <Text style={styles.error}>{error.message}</Text>
          {attemptsLeft !== null ? (
            <Text style={styles.error}>{attemptsLeft === 1 ? '1 try left.' : `${attemptsLeft} tries left.`}</Text>
          ) : null}
        </View>
      ) : notice ? (
        <Text style={font.small}>{notice}</Text>
      ) : null}

      {mustRequestNew ? (
        <Button
          title={countdown.active ? `Send a new code (${countdown.remaining}s)` : 'Send a new code'}
          onPress={sendNew}
          loading={resending}
          disabled={countdown.active}
        />
      ) : (
        <>
          <Button title={submitLabel} onPress={() => submit(code)} loading={verifying} disabled={code.length !== CODE_LENGTH} />
          <Button
            title={countdown.active ? `Resend code in ${countdown.remaining}s` : 'Resend code'}
            variant="text"
            onPress={sendNew}
            loading={resending}
            disabled={countdown.active}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.lg },
  messages: { gap: spacing.xs },
  error: { color: colors.danger, fontSize: 14 },
});
