import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import {
  handleInitialNotificationResponse,
  registerNotificationResponseHandler,
} from '@/src/lib/push';
import { useProveStore } from '@/src/store/prove-store';
import { navigationTheme } from '@/src/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  // Restore auth here, not in app/index.tsx: dev reloads and deep links can
  // mount straight onto a restored route without ever rendering the index.
  const restoreSession = useProveStore((state) => state.restoreSession);
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    void restoreSession()
      .catch(() => {})
      .finally(() => setSessionRestored(true));
  }, [restoreSession]);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && sessionRestored) {
      SplashScreen.hideAsync();
    }
  }, [loaded, sessionRestored]);

  // Tap-to-navigate: a listener for taps while running, plus a one-time
  // check for a cold start launched by tapping a notification. Gated on the
  // same readiness the splash screen waits for so the Stack is mounted
  // before router.push runs.
  useEffect(() => {
    if (!loaded || !sessionRestored) return;
    const unsubscribe = registerNotificationResponseHandler();
    void handleInitialNotificationResponse();
    return unsubscribe;
  }, [loaded, sessionRestored]);

  if (!loaded || !sessionRestored) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
        {/* Swipe-back disabled: it fights the before/after drag slider. */}
        <Stack.Screen name="case/[id]" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen
          name="approval/[id]"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="my-results" options={{ headerShown: false }} />
        <Stack.Screen name="rewards" options={{ headerShown: false }} />
        <Stack.Screen name="clinic/[slug]" options={{ headerShown: false }} />
        <Stack.Screen
          name="consult-request"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen name="practice-profile" options={{ headerShown: false }} />
        <Stack.Screen name="wizard" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
