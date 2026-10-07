// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Architecture guards: one module owns each sensitive dependency.
 * - axios            → src/api/network.ts only
 * - expo-secure-store → src/services/storage/tokenStorage.ts only
 * - AsyncStorage      → src/services/storage/prefsStorage.ts only
 * - NFC               → src/services/nfc/nfc.ts only (it always cancels the technology request)
 * - expo-notifications → src/services/push/push.ts only
 */
const restricted = [
  { name: 'axios', message: 'Only src/api/network.ts may import axios. Use the API modules in src/api.' },
  { name: 'expo-secure-store', message: 'Only src/services/storage/tokenStorage.ts may use SecureStore.' },
  {
    name: '@react-native-async-storage/async-storage',
    message: 'Only src/services/storage/prefsStorage.ts may use AsyncStorage (safe preferences only).',
  },
  {
    name: 'expo-notifications',
    message: 'Only src/services/push/push.ts may use expo-notifications (iOS token type is still an open question).',
  },
  {
    name: 'react-native-nfc-manager',
    message: 'Only src/services/nfc/nfc.ts may use NFC (it always cancels the technology request).',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'scripts/*', 'coverage/*'],
  },
  {
    rules: {
      'no-restricted-imports': ['error', { paths: restricted }],
    },
  },
  {
    files: [
      'src/api/network.ts',
      'src/services/storage/tokenStorage.ts',
      'src/services/storage/prefsStorage.ts',
      'src/services/nfc/nfc.ts',
      'src/services/push/push.ts',
      '**/__tests__/**',
      'tests/**',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
