import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { refreshOnForeground, runBootstrap } from '@/features/session/sessionThunks';
import { useAppForeground } from '@/hooks/useAppForeground';
import { startConnectivity } from '@/services/network/connectivity';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { store } from '@/store/store';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}

function RootNavigator() {
  const dispatch = useAppDispatch();
  const phase = useAppSelector((s) => s.session.phase);
  const started = useRef(false);

  useEffect(() => {
    const stopConnectivity = startConnectivity(dispatch);
    if (!started.current) {
      started.current = true;
      dispatch(runBootstrap());
    }
    return stopConnectivity;
  }, [dispatch]);

  useEffect(() => {
    if (phase !== 'booting') SplashScreen.hideAsync().catch(() => undefined);
  }, [phase]);

  useAppForeground(() => {
    dispatch(refreshOnForeground());
  });

  // Splash stays up; no route (protected or not) renders before bootstrap resolves.
  if (phase === 'booting') return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={phase === 'signedIn'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={phase === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={phase === 'updateRequired'}>
          <Stack.Screen name="update-required" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={phase === 'startupError'}>
          <Stack.Screen name="startup-error" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={phase === 'suspended'}>
          <Stack.Screen name="suspended" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
      <OfflineBanner />
    </>
  );
}
