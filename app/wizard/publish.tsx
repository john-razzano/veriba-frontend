import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PhotoPairCard } from '@/src/components/photo-preview';
import { ChipButton, OutlineButton, SectionCard } from '@/src/components/ui';
import { WizardScreen } from '@/src/components/wizard-screen';
import { generateSEO } from '@/src/data/mockData';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { useProveStore } from '@/src/store/prove-store';
import type { PublishDestination } from '@/src/types';

const destinationLabels: Record<PublishDestination, string> = {
  widget: 'Practice Website Widget',
  gallery: 'Provē Gallery',
  gbp: 'Google Business Profile',
};

export default function PublishStepScreen() {
  const router = useRouter();
  const practice = useProveStore((state) => state.practice);
  const wizard = useProveStore((state) => state.wizard);
  const setWizardStep = useProveStore((state) => state.setWizardStep);
  const toggleWizardDestination = useProveStore((state) => state.toggleWizardDestination);
  const publishWizardSession = useProveStore((state) => state.publishWizardSession);
  const resetWizard = useProveStore((state) => state.resetWizard);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; mode: 'published' } | null>(null);

  useEffect(() => {
    setWizardStep(4);
  }, [setWizardStep]);

  const seo =
    wizard.treatment && wizard.category
      ? generateSEO(wizard.treatment, practice)
      : null;

  const canSubmit =
    Boolean(wizard.treatment) &&
    Boolean(wizard.beforePhoto) &&
    Boolean(wizard.afterPhoto) &&
    Boolean(wizard.consentTier);

  if (!result && (!wizard.treatment || !wizard.beforePhoto || !wizard.afterPhoto || !wizard.consentTier)) {
    return <Redirect href="/wizard/consent" />;
  }

  const handlePublish = async () => {
    try {
      setSubmitting(true);
      const sessionId = await publishWizardSession();

      if (!sessionId) {
        Alert.alert('Unable to complete', 'Some session data is missing.');
        return;
      }

      setResult({ id: sessionId, mode: 'published' });
      resetWizard();
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <WizardScreen
        step={4}
        continueLabel="Done — Back to Home"
        onContinue={() => router.replace('/')}>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>
            Published & Optimized
          </Text>
          <Text style={styles.successText}>
            The session is now available in its selected destinations with generated SEO metadata.
          </Text>
        </View>
        <OutlineButton label="View Session Detail" onPress={() => router.replace(`/session/${result.id}`)} />
      </WizardScreen>
    );
  }

  return (
    <WizardScreen
      step={4}
      continueLabel={submitting ? 'Publishing…' : 'Publish & Optimize'}
      continueDisabled={!canSubmit || submitting}
      onContinue={() => void handlePublish()}>
      <Text style={styles.title}>Review & Publish</Text>
      <PhotoPairCard
        beforeUri={wizard.beforePhoto?.uri}
        afterUri={wizard.afterPhoto?.uri}
        beforeObscuration={wizard.beforeObscuration}
        afterObscuration={wizard.afterObscuration}
        treatment={wizard.treatment ?? undefined}
        location={`${practice.name} · ${practice.location}`}
        seed={wizard.treatment ?? 'session'}
        verified
      />

      {seo ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Auto-generated SEO Metadata</Text>
          <MetaCard label="Page Title" value={seo.title} />
          <MetaCard label="Image Alt Text" value={seo.altText} />
          <MetaCard label="Meta Description" value={seo.metaDescription} />
          <MetaCard label="Dedicated URL" value={seo.url} />
          <MetaCard label="Filename" value={seo.filename} />
        </SectionCard>
      ) : null}

      <SectionCard>
        <Text style={styles.sectionTitle}>Publish Destinations</Text>
        <View style={styles.destinations}>
          {(['widget', 'gallery', 'gbp'] as PublishDestination[]).map((destination) => (
            <ChipButton
              key={destination}
              label={destinationLabels[destination]}
              sublabel={wizard.publishDestinations.includes(destination) ? 'Enabled' : 'Disabled'}
              active={wizard.publishDestinations.includes(destination)}
              onPress={() => toggleWizardDestination(destination)}
              style={styles.destinationChip}
            />
          ))}
        </View>
      </SectionCard>
    </WizardScreen>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metaCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.bgInput,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 4,
  },
  metaLabel: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  metaValue: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text,
  },
  destinations: {
    gap: spacing.sm,
  },
  destinationChip: {
    width: '100%',
  },
  successCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.successBg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  successTitle: {
    fontFamily: fonts.display.light,
    fontSize: 30,
    color: colors.success,
  },
  successText: {
    ...typography.bodyMd,
    color: colors.textMid,
  },
});
