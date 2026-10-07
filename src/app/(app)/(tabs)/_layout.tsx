import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { LocationButton } from '@/features/location/LocationButton';
import { BellButton } from '@/features/notifications/BellButton';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

/** Location switcher and bell, on every tab's header. */
function HeaderActions() {
  return (
    <View style={styles.headerActions}>
      <LocationButton />
      <BellButton />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerTitleStyle: { color: colors.text },
        headerRight: HeaderActions,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="send" options={{ title: 'Send', tabBarIcon: icon('paper-plane-outline') }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats', tabBarIcon: icon('chatbubbles-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('menu-outline'), headerRight: () => <BellButton /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.xs },
});
