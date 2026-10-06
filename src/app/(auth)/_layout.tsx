import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="code" />
      <Stack.Screen name="password" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="finish-on-web" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
