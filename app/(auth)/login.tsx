import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppInput, GradientButton, OutlineButton } from '@/src/components/ui';
import { getApiBaseUrl } from '@/src/lib/veriba-api';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, gradients, radii, shadows, spacing, typography } from '@/src/theme';

type AuthMode = 'login' | 'register';
type AccountRole = 'member' | 'provider';

export default function LoginScreen() {
  const router = useRouter();
  const login = useProveStore((state) => state.login);
  const register = useProveStore((state) => state.register);
  const isAuthenticating = useProveStore((state) => state.isAuthenticating);
  const authError = useProveStore((state) => state.authError);
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<AccountRole>('member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [practiceLocation, setPracticeLocation] = useState('');
  const [practiceWebsite, setPracticeWebsite] = useState('');
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    (mode === 'login' ||
      (name.trim().length > 0 &&
        (role === 'member' ||
          (practiceName.trim().length > 0 && practiceLocation.trim().length > 0))));

  const handleSubmit = async () => {
    try {
      setSubmitStatus(
        `${mode === 'login' ? 'Logging in' : 'Creating account'} against ${getApiBaseUrl() || '/api'}`
      );
      console.log('[auth.screen] submit', {
        mode,
        email: email.trim(),
        apiBaseUrl: getApiBaseUrl() || '/api',
      });
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({
          email,
          password,
          name,
          role,
          practiceName,
          practiceLocation,
          practiceWebsite,
        });
      }
      console.log('[auth.screen] auth action resolved, navigating');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[auth.screen] auth action failed', error);
      setSubmitStatus(null);
      Alert.alert(
        mode === 'login' ? 'Unable to log in' : 'Unable to create account',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrap}>
        <View style={styles.logoBlock}>
          <LinearGradient colors={gradients.primary} style={styles.logoHalo} />
          <Text style={styles.logo}>Veriba</Text>
          <Text style={styles.byline}>BY AGENCĒ</Text>
          <Text style={styles.tagline}>
            Verified before & after photos.{'\n'}Real results. Real trust.
          </Text>
        </View>

        <View style={styles.formCard}>
          {mode === 'register' ? (
            <>
              <View style={styles.roleSeg}>
                {(
                  [
                    ['member', "I'm exploring results"],
                    ['provider', "I'm a clinic"],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setRole(value)}
                    style={[styles.roleSegItem, role === value && styles.roleSegItemOn]}>
                    <Text
                      style={[styles.roleSegText, role === value && styles.roleSegTextOn]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <AppInput value={name} onChangeText={setName} placeholder="Full name" />
              {role === 'provider' ? (
                <>
                  <AppInput
                    value={practiceName}
                    onChangeText={setPracticeName}
                    placeholder="Practice name"
                  />
                  <AppInput
                    value={practiceLocation}
                    onChangeText={setPracticeLocation}
                    placeholder="Practice location"
                  />
                  <AppInput
                    value={practiceWebsite}
                    onChangeText={setPracticeWebsite}
                    placeholder="Practice website"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </>
              ) : null}
            </>
          ) : null}

          <AppInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <AppInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
          />

          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          {submitStatus ? <Text style={styles.statusText}>{submitStatus}</Text> : null}

          <GradientButton
            label={
              isAuthenticating
                ? mode === 'login'
                  ? 'Signing In…'
                  : 'Creating Account…'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'
            }
            onPress={() => void handleSubmit()}
            disabled={!canSubmit || isAuthenticating}
          />
          <OutlineButton
            label={mode === 'login' ? 'Need an account?' : 'Already have an account?'}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          />
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.legal}>
            API base URL: {getApiBaseUrl() || 'relative /api on web, set env var on native'}
          </Text>
          <Text style={styles.footer}>Powered by Agencē Studio</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  logoBlock: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  logoHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.08,
    top: -36,
  },
  logo: {
    fontFamily: fonts.display.light,
    fontSize: 54,
    color: colors.copper,
    letterSpacing: -1.2,
  },
  byline: {
    marginTop: spacing.sm,
    fontFamily: fonts.body.medium,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.textLight,
  },
  tagline: {
    marginTop: spacing.xl,
    textAlign: 'center',
    ...typography.bodyLg,
    color: colors.textMid,
  },
  roleSeg: {
    flexDirection: 'row',
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.xs,
  },
  roleSegItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  roleSegItemOn: {
    backgroundColor: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  roleSegText: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.textMid,
  },
  roleSegTextOn: {
    color: colors.white,
  },
  formCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  errorText: {
    ...typography.bodyXs,
    color: colors.error,
  },
  statusText: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  metaBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  legal: {
    textAlign: 'center',
    ...typography.bodyXs,
    color: colors.textLight,
  },
  footer: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
