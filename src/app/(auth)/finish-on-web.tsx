import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { font, spacing } from '@/constants/theme';

/** Google sign-in created a new account (is_new_user). Onboarding is web-only. */
export default function FinishOnWebScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.body}>
        <Text style={font.title}>Finish setting up on the web</Text>
        <Text style={font.body}>
          Your OneTouchReview account was created. Open OneTouchReview on the web to finish setting up your business,
          then sign in here.
        </Text>
      </View>
      <Button title="Back to sign in" onPress={() => router.dismissTo('/sign-in')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  body: { gap: spacing.md },
});
