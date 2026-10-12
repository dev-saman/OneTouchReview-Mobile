import { Linking } from 'react-native';

import { Config } from '@/config/env';

/** Opens the OneTouchReview web app in the browser. Only ever the app's home page. */
export function openWebApp(): void {
  Linking.openURL(Config.webAppUrl).catch(() => undefined);
}
