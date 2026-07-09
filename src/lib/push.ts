import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
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
// Bootstrap can run more than once at startup; without this guard two
// concurrent registrations race the same token into the backend and one
// loses on the unique constraint (409), leaving registration non-deterministic.
let inFlight: Promise<void> | null = null;

export function registerForPushNotifications(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doRegister().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRegister(): Promise<void> {
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

type PushData = { followup_id?: string; kind?: 'approval' | 'after_upload' } | undefined;

function navigateFromNotificationData(data: PushData) {
  if (!data?.followup_id) return;
  if (data.kind === 'after_upload') {
    // No dedicated in-app upload screen yet — Inbox is the closest surface
    // (the emailed upload_url link is still the actual upload path).
    router.push('/(tabs)/inbox' as never);
  } else {
    router.push(`/approval/${data.followup_id}` as never);
  }
}

/** Tapped while the app is running (foreground or backgrounded, not killed). */
export function registerNotificationResponseHandler(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    navigateFromNotificationData(response.notification.request.content.data as PushData);
  });
  return () => sub.remove();
}

/** Cold start via notification tap — check once the navigator is mounted. */
export async function handleInitialNotificationResponse(): Promise<void> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;
    navigateFromNotificationData(response.notification.request.content.data as PushData);
  } catch {
    // Nothing to navigate to — ignore.
  }
}
