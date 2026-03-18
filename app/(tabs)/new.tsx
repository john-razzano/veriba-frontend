import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GradientButton, OutlineButton, ScreenScroll, SectionCard } from '@/src/components/ui';
import { colors, fonts, gradients, radii, spacing, typography } from '@/src/theme';
import { useProveStore } from '@/src/store/prove-store';
import { LinearGradient } from 'expo-linear-gradient';

export default function NewScreen() {
  const router = useRouter();
  const startWizard = useProveStore((state) => state.startWizard);

  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <LinearGradient colors={gradients.primary} style={styles.hero}>
        <Text style={styles.heroEyebrow}>New Session</Text>
        <Text style={styles.heroTitle}>Capture, verify, consent, publish.</Text>
        <Text style={styles.heroText}>
          Provē records chain-of-custody metadata from the first capture through publish.
        </Text>
      </LinearGradient>

      <SectionCard>
        <Text style={styles.blockTitle}>Workflow</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>1. Select the treatment performed.</Text>
          <Text style={styles.listItem}>2. Capture before and after photos.</Text>
          <Text style={styles.listItem}>3. Record consent and obscuring preference.</Text>
          <Text style={styles.listItem}>4. Review SEO metadata and publish destinations.</Text>
        </View>
      </SectionCard>

      <GradientButton
        label="Start New Session"
        onPress={() => {
          startWizard();
          router.push('/wizard/treatment');
        }}
      />
      <OutlineButton label="Review Existing Sessions" onPress={() => router.replace('/(tabs)')} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroEyebrow: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
  },
  heroTitle: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.white,
    letterSpacing: -0.6,
  },
  heroText: {
    ...typography.bodyMd,
    color: 'rgba(255,255,255,0.86)',
  },
  blockTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  listItem: {
    ...typography.bodyMd,
    color: colors.textMid,
  },
});
