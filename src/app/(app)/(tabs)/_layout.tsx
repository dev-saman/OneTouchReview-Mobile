import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';

import { BrandMark } from '@/components/ui/Brand';
import { colors, shadow, spacing } from '@/constants/theme';
import { LocationButton } from '@/features/location/LocationButton';
import { BellButton } from '@/features/notifications/BellButton';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Outline icon, filled when the tab is selected. */
function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} color={color} size={size} />;
  };
}

/** The Send tab: a raised teal button in the middle of the tab bar. */
function SendTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.sendButton, focused && styles.sendButtonFocused]}>
      <Ionicons name="paper-plane" size={24} color={colors.onPrimary} />
    </View>
  );
}

/** Brand mark next to the tab's title. */
function HeaderTitle({ children }: { children: string }) {
  return (
    <View style={styles.title}>
      <BrandMark size={28} />
      <Text style={styles.titleText} accessibilityRole="header" numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
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
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        headerTitle: HeaderTitle,
        headerTitleAlign: 'left',
        headerStyle: styles.header,
        headerShadowVisible: false,
        headerRight: HeaderActions,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: icon('people-outline', 'people') }} />
      <Tabs.Screen name="send" options={{ title: 'Send', tabBarIcon: SendTabIcon }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats', tabBarIcon: icon('chatbubbles-outline', 'chatbubbles') }} />
      <Tabs.Screen
        name="more"
        options={{ title: 'More', tabBarIcon: icon('menu-outline', 'menu'), headerRight: () => <BellButton /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface },
  title: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { fontSize: 20, fontWeight: '700', color: colors.text },
  tabBar: { backgroundColor: colors.surface, borderTopColor: colors.border },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.xs },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadow,
  },
  sendButtonFocused: { backgroundColor: colors.primaryPressed },
});
