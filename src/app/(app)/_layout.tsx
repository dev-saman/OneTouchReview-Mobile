import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { NotificationBadgeProvider } from '@/features/notifications/BadgeProvider';

/** Signed-in area. Only reachable when session.phase === 'signedIn' (root guard). */
export default function AppLayout() {
  return (
    <NotificationBadgeProvider>
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
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="client/[id]" options={{ title: 'Client' }} />
        <Stack.Screen name="chats/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="card" options={{ title: 'My card' }} />
        <Stack.Screen name="card/edit" options={{ title: 'Edit card' }} />
        <Stack.Screen name="reports" options={{ title: 'Reports' }} />
        <Stack.Screen name="ask-ai" options={{ title: 'Ask AI' }} />
        <Stack.Screen name="feedback" options={{ title: 'Private feedback' }} />
        <Stack.Screen name="feedback/[id]" options={{ title: 'Feedback' }} />
        <Stack.Screen name="reviews" options={{ title: 'Reviews' }} />
        <Stack.Screen name="reviews/[id]" options={{ title: 'Review' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="profile/confirm-email" options={{ title: 'Confirm email' }} />
        <Stack.Screen name="profile/password" options={{ title: 'Password' }} />
        <Stack.Screen name="profile/remove-password" options={{ title: 'Remove password' }} />
        <Stack.Screen name="profile/change-email" options={{ title: 'Change email' }} />
        <Stack.Screen name="profile/devices" options={{ title: 'Signed-in devices' }} />
      </Stack>
    </NotificationBadgeProvider>
  );
}
