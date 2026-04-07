import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ImageEditorModal } from '@/src/components/image-editor-modal';
import {
  ProgressionCarouselCard,
  type ProgressionCarouselItem,
} from '@/src/components/photo-preview';
import { SignaturePad } from '@/src/components/signature-pad';
import { ChipButton, SectionCard } from '@/src/components/ui';
import { WizardScreen } from '@/src/components/wizard-screen';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { CONSENT_TIERS } from '@/src/types';
import {
  followUpMethodLabel,
  followUpTimingLabel,
  formatCompactDate,
} from '@/src/utils/format';

export default function ConsentStepScreen() {
  const router = useRouter();
  const wizard = useProveStore((state) => state.wizard);
  const practice = useProveStore((state) => state.practice);
  const setWizardStep = useProveStore((state) => state.setWizardStep);
  const setWizardConsentTier = useProveStore((state) => state.setWizardConsentTier);
  const setWizardPhotoObscuration = useProveStore((state) => state.setWizardPhotoObscuration);
  const setWizardSignature = useProveStore((state) => state.setWizardSignature);
  const [showPad, setShowPad] = useState(false);
  const [signatureDrawing, setSignatureDrawing] = useState(false);
  const [editorTarget, setEditorTarget] = useState<'before' | 'after' | null>(null);
  const clearPadRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    setWizardStep(3);
  }, [setWizardStep]);

  useEffect(() => {
    if (!showPad) {
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);

    return () => clearTimeout(timeoutId);
  }, [showPad]);

  if (!wizard.treatment || !wizard.beforePhoto) {
    return <Redirect href="/wizard/photos" />;
  }

  const featuredAfter = wizard.progressPhotos[0] ?? null;
  const hasAfterPhoto = Boolean(featuredAfter);
  const requiresSignature = Boolean(wizard.consentTier) && wizard.consentTier !== 'decline';
  const canContinue = wizard.consentTier === 'decline' || (Boolean(wizard.consentTier) && wizard.signed);

  const carouselItems: ProgressionCarouselItem[] = [
    {
      id: 'baseline',
      title: 'Baseline',
      subtitle: 'Captured by provider',
      meta: formatCompactDate(wizard.beforePhoto.capturedAt),
      uri: wizard.beforePhoto.uri,
      obscuration: wizard.beforeObscuration,
      variant: 'before',
      badge: 'Provider',
      onEdit: hasAfterPhoto && wizard.consentTier ? () => setEditorTarget('before') : undefined,
    },
  ];

  if (featuredAfter) {
    carouselItems.push({
      id: featuredAfter.id,
      title: featuredAfter.label || 'After',
      subtitle:
        featuredAfter.submittedBy === 'patient' ? 'Submitted by patient' : 'Captured by provider',
      meta: formatCompactDate(featuredAfter.capturedAt),
      uri: featuredAfter.uri,
      obscuration: wizard.afterObscuration,
      variant: 'after',
      badge: featuredAfter.submittedBy === 'patient' ? 'Patient' : 'Provider',
      onEdit: wizard.consentTier ? () => setEditorTarget('after') : undefined,
    });
  } else {
    carouselItems.push({
      id: 'pending-after',
      title: 'After photo pending',
      subtitle:
        wizard.followUpRequest.method === 'patient_link'
          ? 'Save now and optionally schedule a secure patient upload link.'
          : wizard.followUpRequest.method === 'follow_up_visit'
            ? 'Save now and collect the after photo at a later clinic visit.'
            : 'Save the session as pending until another verified image is added.',
      meta:
        wizard.followUpRequest.method === 'not_needed'
          ? 'No follow-up scheduled.'
          : `${followUpMethodLabel(wizard.followUpRequest.method)} · ${followUpTimingLabel(wizard.followUpRequest.timing)}`,
      pending: true,
      badge: 'Pending',
    });
  }

  return (
    <>
      <WizardScreen
        step={3}
        continueLabel={hasAfterPhoto ? 'Continue' : 'Continue to Review'}
        continueDisabled={!canContinue}
        scrollEnabled={!signatureDrawing}
        scrollRef={scrollRef}
        onContinue={() => router.push('/wizard/publish')}>
        <Text style={styles.title}>Consent & Privacy</Text>
        <ProgressionCarouselCard
          items={carouselItems}
          treatment={wizard.treatment}
          location={
            practice ? `${practice.name} · ${practice.location}` : 'Loading practice details…'
          }
          seed={wizard.treatment}
          verified
        />

        <Text style={styles.sectionLabel}>Usage Consent</Text>
        <View style={styles.stack}>
          {CONSENT_TIERS.map((tier) => (
            <ChipButton
              key={tier.id}
              label={tier.label}
              sublabel={tier.discount}
              active={wizard.consentTier === tier.id}
              onPress={() => setWizardConsentTier(tier.id)}
              style={styles.fullWidthChip}
            />
          ))}
        </View>

        {requiresSignature ? (
          <View style={styles.signatureBlock}>
            <Text style={styles.sectionLabel}>Signature Capture</Text>
            {!showPad ? (
              wizard.signatureSvg ? (
                <View style={styles.signatureStatus}>
                  <View style={styles.signatureMeta}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.signatureText}>Signature captured</Text>
                  </View>
                  <ChipButton
                    label="Edit Signature"
                    sublabel="Reopen the canvas"
                    onPress={() => setShowPad(true)}
                  />
                </View>
              ) : (
                <ChipButton
                  label="Capture Patient Signature"
                  sublabel="Open the signature canvas"
                  onPress={() => setShowPad(true)}
                />
              )
            ) : (
              <View style={styles.padWrap}>
                <SignaturePad
                  onChange={setWizardSignature}
                  onInteractionChange={setSignatureDrawing}
                  onReady={(clear) => {
                    clearPadRef.current = clear;
                  }}
                />
                <View style={styles.padActions}>
                  <ChipButton
                    label="Clear"
                    onPress={() => {
                      clearPadRef.current?.();
                      setWizardSignature(null);
                    }}
                    style={styles.inlineChip}
                  />
                  <ChipButton
                    label="Use Signature"
                    onPress={() => setShowPad(false)}
                    active={Boolean(wizard.signatureSvg)}
                    style={styles.inlineChip}
                  />
                </View>
              </View>
            )}
          </View>
        ) : wizard.consentTier === 'decline' ? (
          <SectionCard style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Patient declined publishing</Text>
            <Text style={styles.noticeText}>
              No signature is required for a declined session. Continuing will save this session as declined.
            </Text>
          </SectionCard>
        ) : null}
      </WizardScreen>

      <ImageEditorModal
        visible={editorTarget === 'before'}
        title="Baseline Image"
        imageUri={wizard.beforePhoto.uri}
        seed={`${wizard.treatment}-before`}
        value={wizard.beforeObscuration}
        onClose={() => setEditorTarget(null)}
        onSave={(value) => setWizardPhotoObscuration('before', value)}
      />
      <ImageEditorModal
        visible={editorTarget === 'after' && Boolean(featuredAfter)}
        title="After Image"
        imageUri={featuredAfter?.uri}
        seed={`${wizard.treatment}-after`}
        value={wizard.afterObscuration}
        onClose={() => setEditorTarget(null)}
        onSave={(value) => setWizardPhotoObscuration('after', value)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textLight,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  fullWidthChip: {
    width: '100%',
  },
  signatureBlock: {
    marginBottom: spacing.xxl,
  },
  signatureStatus: {
    gap: spacing.sm,
  },
  signatureMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  signatureText: {
    ...typography.bodySm,
    color: colors.text,
  },
  padWrap: {
    gap: spacing.sm,
  },
  padActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineChip: {
    flex: 1,
  },
  noticeCard: {
    marginTop: spacing.lg,
  },
  noticeTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noticeText: {
    ...typography.bodySm,
    color: colors.textLight,
  },
});
