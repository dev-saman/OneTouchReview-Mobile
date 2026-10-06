import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { font, spacing } from '@/constants/theme';
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
      <View style={styles.body}>
        <Text style={font.title}>Account suspended</Text>
        <Text style={font.body}>{message ?? 'This account is suspended.'}</Text>
        <Text style={font.small}>Please contact OneTouchReview support.</Text>
      </View>
      <Button title="Try again" variant="secondary" onPress={retry} loading={retrying} />
      <Button title="Sign out" variant="text" onPress={() => dispatch(signOut())} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  body: { gap: spacing.md },
});
