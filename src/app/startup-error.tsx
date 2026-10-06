import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isTransient } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { font, spacing } from '@/constants/theme';
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
      <View style={styles.body}>
        <Text style={font.title}>{offline ? "You're offline" : "Couldn't start OneTouchReview"}</Text>
        <Text style={font.body}>{error?.message ?? 'Please try again.'}</Text>
      </View>
      <Button title="Retry" onPress={retry} loading={retrying} />
      {hasSession && error && !isTransient(error) ? (
        <Button title="Sign out" variant="text" onPress={() => dispatch(signOut())} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  body: { gap: spacing.md },
});
