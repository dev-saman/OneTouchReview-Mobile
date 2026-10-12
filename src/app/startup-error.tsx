import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { isTransient } from '@/api/errors';
import { AuthHeader } from '@/components/ui/AuthHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { runBootstrap, signOut } from '@/features/session/sessionThunks';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * Cold start could not complete (no network, 5xx, or another error before the user was
 * validated). The token is kept; no cached config or identity is used.
 */
export default function StartupErrorScreen() {
  const dispatch = useAppDispatch();
  const error = useAppSelector((s) => s.session.startupError);
  const [retrying, setRetrying] = useState(false);
  const hasSession = !!tokenStorage.get();

  const retry = async () => {
    setRetrying(true);
    try {
      await dispatch(runBootstrap());
    } finally {
      setRetrying(false);
    }
  };

  const offline = error?.kind === 'offline' || error?.kind === 'network' || error?.kind === 'timeout';

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <AuthHeader
        icon={offline ? 'cloud-offline-outline' : 'warning-outline'}
        tone={offline ? 'info' : 'danger'}
        title={offline ? "You're offline" : 'Something went wrong'}
        subtitle={error?.message ?? 'Please try again.'}
      />
      <Button title="Retry" onPress={retry} loading={retrying} />
      {hasSession && error && !isTransient(error) ? (
        <Button title="Sign out" variant="text" onPress={() => dispatch(signOut())} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
});
