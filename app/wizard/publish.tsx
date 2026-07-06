import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { CaseTile } from '@/src/components/case-tile';
import {
  ProgressionCarouselCard,
  type ProgressionCarouselItem,
} from '@/src/components/photo-preview';
import { OutlineButton, SectionCard } from '@/src/components/ui';
import { WizardScreen } from '@/src/components/wizard-screen';
import { buildSeoPreview } from '@/src/lib/veriba-api';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import type { SessionStatus } from '@/src/types';
import {
  followUpMethodLabel,
  followUpTimingLabel,
  formatCompactDate,
} from '@/src/utils/format';

export default function PublishStepScreen() {
  const router = useRouter();
  const practice = useProveStore((state) => state.practice);
  const wizard = useProveStore((state) => state.wizard);
  const setWizardStep = useProveStore((state) => state.setWizardStep);
  const publishWizardSession = useProveStore((state) => state.publishWizardSession);
  const resetWizard = useProveStore((state) => state.resetWizard);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    mode: SessionStatus;
    previewUri: string | null;
    treatment: string | null;
  } | null>(null);

  useEffect(() => {
    setWizardStep(4);
  }, [setWizardStep]);

  const seo =
    practice && wizard.treatment && wizard.category
      ? buildSeoPreview(wizard.treatment, practice)
      : null;

  const beforePhoto = wizard.beforePhoto;
  const afterPhoto = wizard.progressPhotos[0] ?? null;
  const progressionReady = Boolean(afterPhoto);
  const consentSatisfied = progressionReady
    ? wizard.consentTier === 'decline' || (Boolean(wizard.consentTier) && wizard.signed)
    : true;
  const canSubmit = Boolean(wizard.treatment) && Boolean(beforePhoto) && consentSatisfied;

  if (!result && (!wizard.treatment || !beforePhoto)) {
    return <Redirect href="/wizard/photos" />;
  }

  if (result) {
    return (
      <WizardScreen step={4} continueLabel="Done" onContinue={() => router.replace('/')}>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>
            {result.mode === 'published'
              ? 'Published'
              : result.mode === 'declined'
                ? 'Consent Declined'
                : 'Pending Entry Saved'}
          </Text>
          <Text style={styles.successText}>
            {result.mode === 'published'
              ? 'This case is now live in Veriba discovery and on your public page.'
              : result.mode === 'declined'
                ? 'The session was saved in a declined state and will not be published.'
                : 'The session was saved as pending. Return when the after photo is ready.'}
          </Text>
        </View>

        {result.mode === 'published' && result.previewUri ? (
          <View style={styles.previewBlock}>
            <Text style={styles.previewLabel}>HOW IT APPEARS TO MEMBERS</Text>
            <View style={styles.previewTile}>
              <CaseTile
                afterUri={result.previewUri}
                treatment={result.treatment ?? ''}
                clinic={practice?.name ?? ''}
                onPress={() => router.replace(`/session/${result.id}`)}
              />
            </View>
          </View>
        ) : null}

        <OutlineButton
          label="View Entry Detail"
          onPress={() => router.replace(`/session/${result.id}`)}
        />
      </WizardScreen>
    );
  }

  if (!beforePhoto) {
    return null;
  }

  const carouselItems: ProgressionCarouselItem[] = [
    {
      id: 'baseline',
      title: 'Baseline',
      subtitle: 'Captured by provider',
      meta: formatCompactDate(beforePhoto.capturedAt),
      uri: beforePhoto.uri,
      obscuration: wizard.beforeObscuration,
      variant: 'before',
      badge: 'Provider',
    },
  ];

  if (afterPhoto) {
    carouselItems.push({
      id: afterPhoto.id,
      title: afterPhoto.label || 'After',
      subtitle:
        afterPhoto.submittedBy === 'patient' ? 'Submitted by patient' : 'Captured by provider',
      meta: formatCompactDate(afterPhoto.capturedAt),
      uri: afterPhoto.uri,
      obscuration: wizard.afterObscuration,
      variant: 'after',
      badge: afterPhoto.submittedBy === 'patient' ? 'Patient' : 'Provider',
    });
  } else {
    carouselItems.push({
      id: 'pending-after',
      title: 'Entry still pending',
      subtitle:
        wizard.followUpRequest.method === 'patient_link'
          ? 'Save now and the app can schedule a secure upload link for the patient.'
          : wizard.followUpRequest.method === 'follow_up_visit'
            ? 'Save now and capture the after photo at the planned follow-up visit.'
            : 'Save now and return later when the after photo is ready.',
      meta:
        wizard.followUpRequest.method === 'not_needed'
          ? 'No follow-up has been scheduled.'
          : `${followUpMethodLabel(wizard.followUpRequest.method)} · ${followUpTimingLabel(wizard.followUpRequest.timing)}`,
      pending: true,
      badge: 'Pending',
    });
  }

  const handlePublish = async () => {
    try {
      setSubmitting(true);
      const sessionResult = await publishWizardSession();

      if (!sessionResult) {
        Alert.alert('Unable to complete', 'Some session data is missing.');
        return;
      }

      // Snapshot the preview before resetWizard clears the local photos.
      setResult({
        ...sessionResult,
        previewUri: afterPhoto?.uri ?? beforePhoto?.uri ?? null,
        treatment: wizard.treatment,
      });
      resetWizard();
    } catch (error) {
      Alert.alert(
        'Unable to save session',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WizardScreen
      step={4}
      continueLabel={
        submitting
          ? progressionReady
            ? 'Publishing…'
            : 'Saving…'
          : progressionReady
            ? wizard.consentTier === 'decline'
              ? 'Save Declined Session'
              : 'Publish Session'
            : 'Save Pending Entry'
      }
      continueDisabled={!canSubmit || submitting}
      onContinue={() => void handlePublish()}>
      <Text style={styles.title}>Review & Submit</Text>
      <ProgressionCarouselCard
        items={carouselItems}
        treatment={wizard.treatment ?? undefined}
        location={
          practice ? `${practice.name} · ${practice.location}` : 'Loading practice details…'
        }
        seed={wizard.treatment ?? 'session'}
        verified
      />

      <SectionCard>
        <Text style={styles.sectionTitle}>Session State</Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {progressionReady
              ? wizard.consentTier === 'decline'
                ? 'Declined'
                : 'Ready to Publish'
              : 'Pending After Photo'}
          </Text>
          <Text style={styles.statusText}>
            {progressionReady
              ? wizard.consentTier === 'decline'
                ? 'This session will be saved as declined and kept off the gallery.'
                : 'Both images and consent will be saved and the session will go live.'
              : wizard.followUpRequest.method === 'patient_link'
                ? wizard.followUpRequest.sendImmediately
                  ? 'The baseline will be saved and a secure upload link sent to the patient immediately.'
                  : 'The baseline will be saved and a patient upload link scheduled if contact details are provided.'
                : wizard.followUpRequest.method === 'follow_up_visit'
                  ? 'The session will be saved as pending until the after photo is added at a follow-up visit.'
                  : 'The session will be saved as pending without any follow-up scheduled.'}
          </Text>
        </View>
      </SectionCard>

      {seo ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>
            {progressionReady ? 'SEO Preview' : 'Future SEO Preview'}
          </Text>
          <MetaCard label="Page Title" value={seo.title} />
          <MetaCard label="Image Alt Text" value={seo.altText} />
          <MetaCard label="Meta Description" value={seo.metaDescription} />
          <MetaCard label="Dedicated URL" value={seo.url} />
          <MetaCard label="Filename" value={seo.filename} />
        </SectionCard>
      ) : null}

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
  statusCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.bgInput,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.text,
  },
  statusText: {
    ...typography.bodySm,
    color: colors.textMid,
  },
  metaCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.bgInput,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 4,
  },
  metaLabel: {
    ...typography.label,
    color: colors.textLight,
  },
  metaValue: {
    ...typography.bodySm,
    color: colors.text,
  },
  previewBlock: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  previewLabel: {
    ...typography.label,
    color: colors.textLight,
  },
  previewTile: {
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  successCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.successBg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontFamily: fonts.display.light,
    fontSize: 30,
    color: colors.text,
  },
  successText: {
    ...typography.bodyMd,
    color: colors.textMid,
  },
});
