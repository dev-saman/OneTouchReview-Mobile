import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authApi } from '@/api/auth.api';
import { network } from '@/api/network';
import type { ApiError } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { CODE_LENGTH, CodeInput } from '@/components/ui/CodeInput';
import { Screen } from '@/components/ui/Screen';
import { colors, font, spacing } from '@/constants/theme';
import { completeSignIn } from '@/features/session/sessionThunks';
import { useCountdown } from '@/hooks/useCountdown';
import { useAppDispatch } from '@/store/hooks';

/** Errors tab: these codes mean the current code can no longer work → offer a new one. */
const NEEDS_NEW_CODE = new Set(['CODE_EXPIRED', 'TOO_MANY_ATTEMPTS', 'INVALID_LINK']);

const toSeconds = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** 6-digit code (POST /auth/email-code/verify). Paste and one-time-code autofill supported. */
export default function CodeScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; masked?: string; resendAfter?: string; expiresIn?: string }>();
  const email = params.email ?? '';

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(() => toSeconds(params.expiresIn, 600));
  const resend = useCountdown(toSeconds(params.resendAfter, 30));

  const verify = async (value: string) => {
    if (verifying || value.length !== CODE_LENGTH) return;
    setVerifying(true);
    setError(null);
    setNotice(null);
    try {
      const response = await authApi.verifyEmailCode(email, value);
      await dispatch(completeSignIn(response));
    } catch (e) {
      setError(network.normalizeError(e));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const sendNewCode = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authApi.requestEmailCode(email);
      resend.start(res.resend_after);
      setExpiresIn(res.expires_in);
      setCode('');
      setNotice(`We sent a new code to ${res.email_masked}.`);
    } catch (e) {
      const apiError = network.normalizeError(e);
      if (apiError.retryAfterSeconds) resend.start(apiError.retryAfterSeconds);
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
  const minutes = Math.max(1, Math.round(expiresIn / 60));

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={font.title}>Enter your code</Text>
        <Text style={font.small}>
          We emailed a 6-digit code to {params.masked || email}. It works for {minutes} minutes.
        </Text>
      </View>

      <CodeInput
        value={code}
        onChange={setCode}
        onComplete={verify}
        error={!!error}
        editable={!verifying && !mustRequestNew}
      />

      {error ? (
        <View style={styles.messages} accessibilityLiveRegion="polite">
          <Text style={styles.error}>{error.message}</Text>
          {attemptsLeft !== null ? (
            <Text style={styles.error}>
              {attemptsLeft === 1 ? '1 try left.' : `${attemptsLeft} tries left.`}
            </Text>
          ) : null}
        </View>
      ) : notice ? (
        <Text style={font.small}>{notice}</Text>
      ) : null}

      {mustRequestNew ? (
        <Button
          title={resend.active ? `Send a new code (${resend.remaining}s)` : 'Send a new code'}
          onPress={sendNewCode}
          loading={resending}
          disabled={resend.active}
        />
      ) : (
        <>
          <Button title="Sign in" onPress={() => verify(code)} loading={verifying} disabled={code.length !== CODE_LENGTH} />
          <Button
            title={resend.active ? `Resend code in ${resend.remaining}s` : 'Resend code'}
            variant="text"
            onPress={sendNewCode}
            loading={resending}
            disabled={resend.active}
          />
        </>
      )}

      <Button title="Change email" variant="text" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.md },
  messages: { gap: spacing.xs },
  error: { color: colors.danger, fontSize: 14 },
});
