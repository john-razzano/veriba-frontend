import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';

const googleIosClientId: string =
  (Constants.expoConfig?.extra?.googleIosClientId as string | undefined) ?? '';

// The Google SDK is a native module — require it lazily so the app still runs
// on builds made before it was installed (and hide the button if it's absent).
let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null =
  null;
if (googleIosClientId) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    GoogleSignin?.configure({ iosClientId: googleIosClientId });
  } catch {
    GoogleSignin = null;
  }
}

/**
 * "Continue with Apple / Google" for the auth screen (OAUTH-SPEC). OAuth
 * sign-ups become member accounts; clinics register with email. Apple's
 * native button is mandatory per their guidelines.
 */
export function OAuthButtons({ onSignedIn }: { onSignedIn: () => void }) {
  const loginWithOAuth = useProveStore((state) => state.loginWithOAuth);
  const isAuthenticating = useProveStore((state) => state.isAuthenticating);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  const fail = (error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    // User-cancelled sheets aren't errors worth alerting about.
    if (/cancel/i.test(message)) return;
    Alert.alert('Unable to sign in', message || 'Please try again.');
  };

  const onApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple returned no identity token.');
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ');
      await loginWithOAuth('apple', credential.identityToken, fullName || null);
      onSignedIn();
    } catch (error) {
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      fail(error);
    }
  };

  const onGoogle = async () => {
    if (!GoogleSignin) return;
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      if (!idToken) return; // cancelled
      const name = result.data?.user?.name ?? null;
      await loginWithOAuth('google', idToken, name);
      onSignedIn();
    } catch (error) {
      fail(error);
    }
  };

  if (!appleAvailable && !GoogleSignin) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>

      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radii.lg}
          style={styles.appleBtn}
          onPress={() => {
            if (!isAuthenticating) void onApple();
          }}
        />
      ) : null}

      {GoogleSignin ? (
        <Pressable
          style={styles.googleBtn}
          disabled={isAuthenticating}
          onPress={() => void onGoogle()}>
          <Ionicons name="logo-google" size={16} color={colors.text} />
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>
      ) : null}

      <Text style={styles.note}>
        Signing in this way creates a member account. Clinics register with email.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 2,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.bodyXs, color: colors.textLight },
  appleBtn: { height: 46, width: '100%' },
  googleBtn: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  googleText: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text },
  note: {
    ...typography.bodyXs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
});
