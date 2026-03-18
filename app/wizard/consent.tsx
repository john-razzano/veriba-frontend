import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ImageEditorModal } from '@/src/components/image-editor-modal';
import { PhotoPairCard } from '@/src/components/photo-preview';
import { SignaturePad } from '@/src/components/signature-pad';
import { ChipButton } from '@/src/components/ui';
import { WizardScreen } from '@/src/components/wizard-screen';
import { CONSENT_TIERS } from '@/src/types';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { useProveStore } from '@/src/store/prove-store';

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

  if (!wizard.treatment || !wizard.beforePhoto || !wizard.afterPhoto) {
    return <Redirect href="/wizard/photos" />;
  }

  const canContinue = Boolean(wizard.consentTier) && wizard.signed;

  return (
    <>
      <WizardScreen
        step={3}
        continueLabel="Continue"
        continueDisabled={!canContinue}
        scrollEnabled={!signatureDrawing}
        scrollRef={scrollRef}
        onContinue={() => router.push('/wizard/publish')}>
        <Text style={styles.title}>Patient Consent</Text>
        <PhotoPairCard
          beforeUri={wizard.beforePhoto.uri}
          afterUri={wizard.afterPhoto.uri}
          beforeObscuration={wizard.beforeObscuration}
          afterObscuration={wizard.afterObscuration}
          treatment={wizard.treatment}
          location={`${practice.name} · ${practice.location}`}
          seed={wizard.treatment}
          verified
          onEditBefore={wizard.consentTier ? () => setEditorTarget('before') : undefined}
          onEditAfter={wizard.consentTier ? () => setEditorTarget('after') : undefined}
        />

        <Text style={styles.helperText}>
          {wizard.consentTier
            ? 'Each image can be edited independently. Use the pencil button on either photo to adjust the overlay style, placement, size, opacity, and color.'
            : 'Choose a usage consent level first to unlock the per-image editor.'}
        </Text>

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

        {wizard.consentTier ? (
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
        ) : null}
      </WizardScreen>

      <ImageEditorModal
        visible={editorTarget === 'before'}
        title="Before Image"
        imageUri={wizard.beforePhoto.uri}
        seed={`${wizard.treatment}-before`}
        value={wizard.beforeObscuration}
        onClose={() => setEditorTarget(null)}
        onSave={(value) => setWizardPhotoObscuration('before', value)}
      />
      <ImageEditorModal
        visible={editorTarget === 'after'}
        title="After Image"
        imageUri={wizard.afterPhoto.uri}
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
  helperText: {
    ...typography.bodyXs,
    color: colors.textLight,
    marginBottom: spacing.sm,
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
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.success,
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
});
