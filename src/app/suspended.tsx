import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthHeader } from '@/components/ui/AuthHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { runBootstrap, signOut } from '@/features/session/sessionThunks';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** Errors tab: 403 BUSINESS_SUSPENDED → full-screen message, contact support. */
export default function SuspendedScreen() {
  const dispatch = useAppDispatch();
  const message = useAppSelector((s) => s.session.suspendedMessage);
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await dispatch(runBootstrap());
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <AuthHeader
        icon="shield-outline"
        tone="danger"
        title="Account suspended"
        subtitle={`${message ?? 'This account is suspended.'} Please contact OneTouchReview support.`}
      />
      <Button title="Try again" variant="secondary" onPress={retry} loading={retrying} />
      <Button title="Sign out" variant="text" onPress={() => dispatch(signOut())} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
});
