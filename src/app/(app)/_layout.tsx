import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

/** Signed-in area. Only reachable when session.phase === 'signedIn' (root guard). */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="location-picker" options={{ presentation: 'modal', title: 'Choose location' }} />
      <Stack.Screen name="client/[id]" options={{ title: 'Client' }} />
      <Stack.Screen name="profile/index" options={{ title: 'Profile' }} />
      <Stack.Screen name="profile/confirm-email" options={{ title: 'Confirm email' }} />
      <Stack.Screen name="profile/password" options={{ title: 'Password' }} />
      <Stack.Screen name="profile/remove-password" options={{ title: 'Remove password' }} />
      <Stack.Screen name="profile/change-email" options={{ title: 'Change email' }} />
    </Stack>
  );
}
