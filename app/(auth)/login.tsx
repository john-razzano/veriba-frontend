import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, gradients, radii, shadows, spacing, typography } from '@/src/theme';
import { useProveStore } from '@/src/store/prove-store';

export default function LoginScreen() {
  const router = useRouter();
  const login = useProveStore((state) => state.login);

  const continueWith = (provider: 'google' | 'apple' | 'email') => {
    login(provider);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrap}>
        <View style={styles.logoBlock}>
          <LinearGradient colors={gradients.primary} style={styles.logoHalo} />
          <Text style={styles.logo}>Provē</Text>
          <Text style={styles.byline}>BY AGENCĒ</Text>
          <Text style={styles.tagline}>
            Verified before & after photos.{'\n'}Real results. Real trust.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => continueWith('google')} style={[styles.authButton, shadows.md]}>
            <Ionicons name="logo-google" size={18} color={colors.copper} />
            <Text style={styles.authButtonText}>Continue with Google</Text>
          </Pressable>

          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => continueWith('apple')} style={[styles.appleButton, shadows.md]}>
              <Ionicons name="logo-apple" size={20} color={colors.white} />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </Pressable>
          ) : null}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Pressable onPress={() => continueWith('email')} style={styles.emailButton}>
            <Ionicons name="mail-outline" size={18} color={colors.textMid} />
            <Text style={styles.authButtonText}>Continue with Email</Text>
          </Pressable>
        </View>

        <Text style={styles.legal}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
        <Text style={styles.footer}>Powered by Agencē Studio</Text>
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
    alignItems: 'center',
  },
  logoBlock: {
    marginTop: spacing.xxl,
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
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  authButton: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  authButtonText: {
    ...typography.button,
    color: colors.text,
  },
  appleButton: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  appleButtonText: {
    ...typography.button,
    color: colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.textLight,
  },
  emailButton: {
    minHeight: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  legal: {
    textAlign: 'center',
    ...typography.bodyXs,
    color: colors.textLight,
    maxWidth: 260,
  },
  footer: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
