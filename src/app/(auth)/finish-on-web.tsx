import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { font, spacing } from '@/constants/theme';
import { openWebApp } from '@/services/web/openWebApp';

/** Google sign-in created a new account (is_new_user). Onboarding is web-only. */
export default function FinishOnWebScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <BrandMark size={64} />
      <View style={styles.body}>
        <Text style={font.title}>Finish setting up on the web</Text>
        <Text style={font.body}>
          Your OneTouchReview account was created. Open OneTouchReview on the web to finish setting up your business,
          then sign in here.
        </Text>
      </View>
      <Button title="Open OneTouchReview on the web" onPress={() => openWebApp()} icon="open-outline" />
      <Button title="Back to sign in" variant="text" onPress={() => router.dismissTo('/sign-in')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  body: { gap: spacing.md },
});
