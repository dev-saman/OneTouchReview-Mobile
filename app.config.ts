import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Firebase files are gitignored (same convention as our other apps). Locally they
 * live in the project root; EAS cloud builds receive them as file environment
 * variables (GOOGLE_SERVICES_JSON / GOOGLE_SERVICE_INFO_PLIST). See README.
 */
const googleServicesJson = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const googleServiceInfoPlist = process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist';

/**
 * Google Sign-In client IDs are not secrets but they do not exist yet (the owner
 * creates them in Google Cloud). Until they are provided, the native plugin is not
 * added and the "Continue with Google" button stays hidden. Never hardcode guesses.
 */
const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;

const plugins: ExpoConfig['plugins'] = [
  'expo-router',
  [
    'expo-splash-screen',
    {
      backgroundColor: '#FFFFFF',
      image: './assets/images/splash-icon.png',
      imageWidth: 96,
    },
  ],
  'expo-secure-store',
  [
    'expo-notifications',
    {
      icon: './assets/images/android-icon-monochrome.png',
      color: '#1D4ED8',
    },
  ],
  [
    'react-native-nfc-manager',
    {
      nfcPermission: 'OneTouchReview uses NFC to write your digital card link to a blank NFC card or sticker.',
      // Apple no longer accepts the "NDEF" reader-session format; "TAG" covers NDEF writing.
      includeNdefEntitlement: false,
    },
  ],
  [
    'expo-image-picker',
    {
      photosPermission: 'OneTouchReview uses your photos so you can add a picture to your digital business card.',
      cameraPermission: false,
      microphonePermission: false,
    },
  ],
];

if (googleIosUrlScheme) {
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'OneTouchReview',
  slug: 'onetouchreview',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'onetouchreview',
  userInterfaceStyle: 'light',
  platforms: ['ios', 'android'],
  ios: {
    bundleIdentifier: 'com.onetouchreview.app',
    supportsTablet: false,
    googleServicesFile: googleServiceInfoPlist,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.onetouchreview.app',
    googleServicesFile: googleServicesJson,
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins,
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? null,
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? null,
    ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
  },
});
