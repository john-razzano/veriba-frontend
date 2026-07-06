import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { registerPushToken, removePushToken } from '@/src/lib/veriba-api';

/**
 * Push-token plumbing (GROWTH-SPEC §4). Delivery stays dark until an APNs key
 * is configured in EAS and we test on a physical device — until then
 * getExpoPushTokenAsync throws (no projectId / no push credentials) and this
 * whole module no-ops. Simulators can never receive remote pushes.
 */

// Without a handler iOS silently drops notifications that arrive while the
// app is foregrounded — the user just never sees them.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === 'granted';
    }
    if (!granted) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.log('[push] no EAS projectId — skipping registration');
      return; // EAS not set up yet — plumbing stays dormant
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[push] expo token:', token);
    if (!token || token === currentToken) return;
    await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
    console.log('[push] token registered with backend');
    currentToken = token;
  } catch (error) {
    // Missing credentials, simulator, or network — all fine to ignore.
    console.log('[push] registration failed:', error);
  }
}

/** Called on logout so a shared device stops getting the old account's pushes. */
export async function unregisterPushToken(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await removePushToken(token);
  } catch {
    // Best effort — backend also cleans up DeviceNotRegistered tokens.
  }
}
