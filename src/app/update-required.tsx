import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { font, spacing } from '@/constants/theme';
import { devicePlatform } from '@/services/device/deviceInfo';
import { useAppSelector } from '@/store/hooks';

/** Blocking: installed version < /app-config min_app_version. */
export default function UpdateRequiredScreen() {
  const storeUrl = useAppSelector((s) => s.appConfig.config?.store_urls?.[devicePlatform] ?? null);
  const storeName = devicePlatform === 'ios' ? 'the App Store' : 'Google Play';

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.body}>
        <Text style={font.title}>Update the app</Text>
        <Text style={font.body}>
          This version of OneTouchReview is no longer supported. Please install the latest version from {storeName}.
        </Text>
      </View>
      {/* store_urls is currently null server-side; the button appears once a URL is provided. */}
      {storeUrl ? <Button title="Update" onPress={() => Linking.openURL(storeUrl)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  body: { gap: spacing.md },
});
