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
  // Android Studio sync fails when the project path has a space (expo-modules-core bug).
  './plugins/with-stub-pch-space-fix',
  [
    'expo-splash-screen',
    {
      // Matches LAUNCH_COLORS.top in src/components/ui/LaunchScreen.tsx (dark brand splash).
      backgroundColor: '#0A2A3A',
      image: './assets/images/splash-icon.png',
      imageWidth: 120,
    },
  ],
  'expo-secure-store',
  [
    'expo-notifications',
    {
      icon: './assets/images/android-icon-monochrome.png',
      color: '#018F7C',
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
  version: '1.1.0',
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
    // Google Play needs a higher versionCode for every upload. android/ is regenerated (CNG),
    // so bump it here, never in android/app/build.gradle.
    versionCode: 2,
    // Added by the Expo template for development overlays; the app doesn't draw over other apps.
    blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
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
  // Keys are omitted when unset: Expo serializes null extras as {} (truthy).
  extra: {
    ...(process.env.GOOGLE_WEB_CLIENT_ID ? { googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID } : {}),
    ...(process.env.GOOGLE_IOS_CLIENT_ID ? { googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID } : {}),
    ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
  },
});
