import { Linking } from 'react-native';

import { Config } from '@/config/env';

/**
 * Opens the OneTouchReview web app in the browser, at its home page or a web-app path
 * (e.g. an Ask AI link). Never a billing link: callers filter paths first.
 */
export function openWebApp(path = ''): void {
  const safePath = typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '';
  Linking.openURL(`${Config.webAppUrl}${safePath}`).catch(() => undefined);
}
