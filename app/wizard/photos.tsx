import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppInput, ChipButton, SectionCard } from '@/src/components/ui';
import {
  PhotoSlot,
  ProgressionCarouselCard,
  type ProgressionCarouselItem,
} from '@/src/components/photo-preview';
import { WizardScreen } from '@/src/components/wizard-screen';
import { lookupMember } from '@/src/lib/veriba-api';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { FOLLOW_UP_METHODS, FOLLOW_UP_TIMINGS } from '@/src/types';
import {
  followUpMethodLabel,
  followUpTimingLabel,
  formatCompactDate,
} from '@/src/utils/format';
import { pickCapturedPhoto } from '@/src/utils/media';

const QR_PREFIX = 'veriba:member:';

export default function PhotosStepScreen() {
  const router = useRouter();
  const wizard = useProveStore((state) => state.wizard);
  const setWizardStep = useProveStore((state) => state.setWizardStep);
  const setWizardPhoto = useProveStore((state) => state.setWizardPhoto);
  const addWizardProgressPhoto = useProveStore((state) => state.addWizardProgressPhoto);
  const removeWizardProgressPhoto = useProveStore((state) => state.removeWizardProgressPhoto);
  const setWizardPatientInitials = useProveStore((state) => state.setWizardPatientInitials);
  const setWizardFollowUpRequest = useProveStore((state) => state.setWizardFollowUpRequest);
  const [loadingSlot, setLoadingSlot] = useState<'baseline' | 'after' | null>(null);
  const [, requestCameraPermission] = useCameraPermissions();
  const scanHandledRef = useRef(false);

  const onScanMemberCode = async () => {
    const permission = await requestCameraPermission();
    if (!permission.granted) return;
    if (!CameraView.isModernBarcodeScannerAvailable) {
      Alert.alert('Scanner unavailable', 'QR scanning needs iOS 16 or later on this device.');
      return;
    }

    scanHandledRef.current = false;
    const sub = CameraView.onModernBarcodeScanned(({ data }) => {
      if (scanHandledRef.current || !data.startsWith(QR_PREFIX)) return;
      scanHandledRef.current = true;
      sub.remove();
      void CameraView.dismissScanner();

      const userId = data.slice(QR_PREFIX.length).trim();
      lookupMember({ userId })
        .then((res) => res.member ?? { id: userId })
        .catch(() => ({ id: userId, name: null, initials: null }))
        .then((member) => {
          setWizardFollowUpRequest({
            patientUserId: member.id,
            memberMatchName: member.name ?? null,
            patientFirstName:
              useProveStore.getState().wizard.followUpRequest.patientFirstName ||
              (member.name ? member.name.split(' ')[0] : ''),
          });
        });
    });
    await CameraView.launchScanner({ barcodeTypes: ['qr'] });
  };

  // Email → member match (badge only; a QR-scanned binding always wins).
  const patientEmail = wizard.followUpRequest.patientEmail;
  const scannedRef = wizard.followUpRequest.patientUserId;
  useEffect(() => {
    const email = patientEmail.trim().toLowerCase();
    if (!email.includes('@') || email.length < 5) return;
    const timer = setTimeout(() => {
      lookupMember({ email })
        .then((res) => {
          const current = useProveStore.getState().wizard.followUpRequest;
          // Don't clobber a QR-scanned link with an email lookup.
          if (current.patientUserId && current.patientUserId !== res.member?.id) return;
          setWizardFollowUpRequest({
            patientUserId: res.member?.id ?? null,
            memberMatchName: res.member?.name ?? null,
          });
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [patientEmail, scannedRef, setWizardFollowUpRequest]);

  useEffect(() => {
    setWizardStep(2);
  }, [setWizardStep]);

  if (!wizard.treatment) {
    return <Redirect href="/wizard/treatment" />;
  }

  const carouselItems: ProgressionCarouselItem[] = [];
  const afterPhoto = wizard.progressPhotos[0] ?? null;

  if (wizard.beforePhoto) {
    carouselItems.push({
      id: 'baseline',
      title: 'Baseline',
      subtitle: 'Captured by provider',
      meta: formatCompactDate(wizard.beforePhoto.capturedAt),
      uri: wizard.beforePhoto.uri,
      obscuration: wizard.beforeObscuration,
      variant: 'before',
      badge: 'Provider',
    });
  }

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
  }

  if (wizard.beforePhoto && !afterPhoto) {
    carouselItems.push({
      id: 'pending-after',
      title:
        wizard.followUpRequest.method === 'patient_link'
          ? 'Patient follow-up pending'
          : wizard.followUpRequest.method === 'follow_up_visit'
            ? 'Future in-clinic after photo'
            : 'After photo still needed',
      subtitle:
        wizard.followUpRequest.method === 'patient_link'
          ? 'A secure upload link can be scheduled now if you have the patient details.'
          : wizard.followUpRequest.method === 'follow_up_visit'
            ? 'Save the entry as pending and capture the after photo at a later visit.'
            : 'Save the entry as pending until another verified image is added.',
      meta:
        wizard.followUpRequest.method === 'not_needed'
          ? 'No follow-up is scheduled.'
          : `${followUpMethodLabel(wizard.followUpRequest.method)} · ${followUpTimingLabel(wizard.followUpRequest.timing)}`,
      pending: true,
      badge: 'Pending',
    });
  }

  const openPicker = (slot: 'baseline' | 'after') => {
    Alert.alert(
      slot === 'baseline' ? 'Add Baseline Photo' : 'Add After Photo',
      'Choose a source',
      [
        {
          text: 'Capture',
          onPress: () => void selectPhoto(slot, 'camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => void selectPhoto(slot, 'library'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const selectPhoto = async (slot: 'baseline' | 'after', source: 'camera' | 'library') => {
    try {
      setLoadingSlot(slot);
      const photo = await pickCapturedPhoto(source);

      if (!photo) {
        return;
      }

      if (slot === 'baseline') {
        setWizardPhoto('before', photo);
      } else {
        addWizardProgressPhoto(photo);
      }

      Alert.alert('Photo added', 'Timestamp, location, and hash recorded.');
    } catch (error) {
      Alert.alert(
        'Unable to add photo',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoadingSlot(null);
    }
  };

  return (
    <WizardScreen
      step={2}
      continueLabel="Continue to Consent"
      continueDisabled={
        !wizard.beforePhoto ||
        (wizard.followUpRequest.method === 'patient_link' &&
          !afterPhoto &&
          (!wizard.followUpRequest.patientFirstName.trim() ||
            (!wizard.followUpRequest.patientUserId &&
              !wizard.followUpRequest.patientEmail.trim())))
      }
      onContinue={() => router.push('/wizard/consent')}>
      <Text style={styles.title}>Build Before & After Pair</Text>
      <Text style={styles.subtitle}>
        <Text style={styles.treatment}>{wizard.treatment}</Text>
      </Text>
      <Text style={styles.bodyText}>
        One baseline and one after image per session. Save as pending if the after photo will come later.
      </Text>

      <SectionCard>
        <Text style={styles.sectionTitle}>Baseline Photo</Text>
        <PhotoCaptureCard
          label="Baseline"
          helper="Required"
          filled={Boolean(wizard.beforePhoto)}
          loading={loadingSlot === 'baseline'}
          onPress={() => openPicker('baseline')}>
          {wizard.beforePhoto ? (
            <PhotoSlot
              label="Before"
              uri={wizard.beforePhoto.uri}
              obscuration={wizard.beforeObscuration}
              seed={`${wizard.treatment}-baseline`}
            />
          ) : null}
        </PhotoCaptureCard>
      </SectionCard>

      {wizard.beforePhoto ? (
        <>
          <SectionCard>
            <Text style={styles.sectionTitle}>Session Preview</Text>
            <Text style={styles.sectionBody}>
              The session stays pending until a verified after photo exists.
            </Text>
            <ProgressionCarouselCard
              items={carouselItems}
              treatment={wizard.treatment}
              location="Session Preview"
              seed={wizard.treatment}
            />

            <View style={styles.actionRow}>
              <ChipButton
                label={
                  loadingSlot === 'after'
                    ? 'Opening…'
                    : afterPhoto
                      ? 'Replace After Photo'
                      : 'Add After Photo'
                }
                sublabel={
                  afterPhoto ? 'Upload a new verified after image' : 'Capture or choose the after image'
                }
                onPress={() => openPicker('after')}
                style={styles.actionChip}
              />
              {afterPhoto ? (
                <ChipButton
                  label="Remove After Photo"
                  sublabel="Return this session to pending"
                  onPress={() => removeWizardProgressPhoto(afterPhoto.id)}
                  style={styles.actionChip}
                />
              ) : null}
            </View>
          </SectionCard>

          {!afterPhoto ? (
            <SectionCard>
              <Text style={styles.sectionTitle}>Pending After-Photo Plan</Text>
              <Text style={styles.sectionBody}>
                If the after image will come later, choose how this pending session should be
                followed up.
              </Text>
              <View style={styles.stack}>
                {FOLLOW_UP_METHODS.map((option) => (
                  <ChipButton
                    key={option.id}
                    label={option.label}
                    sublabel={option.description}
                    active={wizard.followUpRequest.method === option.id}
                    onPress={() =>
                      setWizardFollowUpRequest({
                        method: option.id,
                        status: option.id === 'not_needed' ? 'not_scheduled' : 'scheduled',
                      })
                    }
                    style={styles.fullWidthChip}
                  />
                ))}
              </View>

              {wizard.followUpRequest.method !== 'not_needed' ? (
                <>
                  <Text style={styles.inlineLabel}>Recommended Window</Text>
                  <View style={styles.timingRow}>
                    {FOLLOW_UP_TIMINGS.map((timing) => (
                      <ChipButton
                        key={timing.id}
                        label={timing.label}
                        sublabel={timing.description}
                        active={wizard.followUpRequest.timing === timing.id}
                        onPress={() => setWizardFollowUpRequest({ timing: timing.id })}
                        style={styles.timingChip}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {wizard.followUpRequest.method === 'patient_link' ? (
                <View style={styles.formStack}>
                  <Text style={styles.inlineLabel}>Patient Link Details</Text>

                  {wizard.followUpRequest.patientUserId ? (
                    <View style={styles.memberBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Text style={styles.memberBadgeText}>
                        {wizard.followUpRequest.memberMatchName
                          ? `${wizard.followUpRequest.memberMatchName} — Veriba member`
                          : 'Member code linked'}
                        {'\nThey’ll get an app notification — no email needed.'}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setWizardFollowUpRequest({
                            patientUserId: null,
                            memberMatchName: null,
                          })
                        }>
                        <Text style={styles.memberUnlink}>Unlink</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.scanBtnPrimary}
                      onPress={() => void onScanMemberCode()}>
                      <Ionicons name="qr-code-outline" size={20} color={colors.white} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scanBtnPrimaryText}>
                          Scan patient's Veriba code
                        </Text>
                        <Text style={styles.scanBtnPrimarySub}>
                          Fastest — links the exact account, sends an app notification
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  <View style={styles.orDivider}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>
                      {wizard.followUpRequest.patientUserId
                        ? 'OR ADD AN EMAIL BACKUP'
                        : "OR IF THEY DON'T HAVE THE APP"}
                    </Text>
                    <View style={styles.orLine} />
                  </View>

                  <AppInput
                    value={wizard.followUpRequest.patientFirstName}
                    onChangeText={(value) => setWizardFollowUpRequest({ patientFirstName: value })}
                    placeholder="Patient first name"
                  />
                  <AppInput
                    value={wizard.followUpRequest.patientEmail}
                    onChangeText={(value) => setWizardFollowUpRequest({ patientEmail: value })}
                    placeholder={
                      wizard.followUpRequest.patientUserId
                        ? 'Patient email (optional)'
                        : 'Patient email'
                    }
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {!wizard.followUpRequest.patientUserId ? (
                    <Text style={styles.emailHint}>
                      No app? We'll email them a secure link to upload their photo and review
                      the results on the web — no account required.
                    </Text>
                  ) : null}

                  <AppInput
                    value={wizard.followUpRequest.message}
                    onChangeText={(value) => setWizardFollowUpRequest({ message: value })}
                    placeholder="Optional message"
                    multiline
                    numberOfLines={3}
                    style={styles.messageInput}
                  />
                  <ChipButton
                    label="Send Immediately"
                    sublabel="Debug option: queue the patient upload link for immediate delivery instead of the scheduled window."
                    active={wizard.followUpRequest.sendImmediately}
                    onPress={() =>
                      setWizardFollowUpRequest({
                        sendImmediately: !wizard.followUpRequest.sendImmediately,
                      })
                    }
                    style={styles.fullWidthChip}
                  />
                </View>
              ) : null}

              <View style={styles.planSummary}>
                <Text style={styles.planEyebrow}>Current Plan</Text>
                <Text style={styles.planTitle}>
                  {wizard.followUpRequest.method === 'patient_link'
                    ? 'Schedule a secure patient upload link'
                    : wizard.followUpRequest.method === 'follow_up_visit'
                      ? 'Capture the after photo at a future visit'
                      : 'Keep the session pending without scheduling follow-up'}
                </Text>
                <Text style={styles.planText}>
                  {wizard.followUpRequest.method === 'patient_link'
                    ? wizard.followUpRequest.sendImmediately
                      ? 'A secure upload link will be sent to the patient immediately if contact details are provided.'
                      : `A patient upload link will be scheduled ${followUpTimingLabel(wizard.followUpRequest.timing)} after capture if contact details are provided.`
                    : wizard.followUpRequest.method === 'follow_up_visit'
                      ? `Session saves as pending until a verified after photo is added at a follow-up visit. Target window: ${followUpTimingLabel(wizard.followUpRequest.timing)}.`
                      : 'Session saves as pending with no follow-up scheduled.'}
                </Text>
              </View>
            </SectionCard>
          ) : null}
        </>
      ) : (
        <SectionCard>
          <Text style={styles.sectionTitle}>Session Preview</Text>
          <Text style={styles.sectionBody}>
            Capture the baseline image first. Then you can add the after photo now or leave the
            session pending for later.
          </Text>
        </SectionCard>
      )}

      <Text style={styles.fieldLabel}>Patient Initials</Text>
      <AppInput
        value={wizard.patientInitials}
        onChangeText={setWizardPatientInitials}
        autoCapitalize="characters"
        maxLength={5}
        placeholder="Enter initials"
      />
    </WizardScreen>
  );
}

function PhotoCaptureCard({
  label,
  helper,
  filled,
  loading,
  onPress,
  children,
}: {
  label: string;
  helper?: string;
  filled: boolean;
  loading: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.captureCard, filled && styles.captureCardFilled]}>
      {filled ? (
        <>
          <View style={styles.previewWrap}>{children}</View>
          <View style={styles.captureFooter}>
            <View>
              <Text style={styles.captureLabel}>{label}</Text>
              {helper ? <Text style={styles.captureHelper}>{helper}</Text> : null}
            </View>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>
        </>
      ) : (
        <View style={styles.captureEmpty}>
          <Ionicons name="camera-outline" size={22} color={colors.textLight} />
          <Text style={styles.captureEmptyLabel}>{loading ? 'Opening…' : label}</Text>
          {helper ? <Text style={styles.captureHelper}>{helper}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  treatment: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.copper,
  },
  bodyText: {
    ...typography.bodyMd,
    color: colors.textMid,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    ...typography.bodyXs,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  captureCard: {
    minHeight: 250,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    padding: spacing.sm,
    backgroundColor: colors.bgCard,
  },
  captureCardFilled: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  captureEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  captureEmptyLabel: {
    ...typography.bodySm,
    color: colors.textMid,
  },
  previewWrap: {
    flex: 1,
    minHeight: 185,
  },
  captureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  captureLabel: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.text,
  },
  captureHelper: {
    ...typography.bodyXs,
    color: colors.textLight,
    marginTop: 2,
  },
  actionRow: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionChip: {
    width: '100%',
  },
  stack: {
    gap: spacing.sm,
  },
  fullWidthChip: {
    width: '100%',
  },
  inlineLabel: {
    ...typography.label,
    color: colors.textLight,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  timingRow: {
    gap: spacing.sm,
  },
  timingChip: {
    width: '100%',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: '#D6E8DD',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memberBadgeText: {
    ...typography.bodyXs,
    color: colors.success,
    flex: 1,
    fontFamily: fonts.body.semibold,
    lineHeight: 16,
  },
  memberUnlink: {
    ...typography.bodyXs,
    color: colors.textMid,
    textDecorationLine: 'underline',
  },
  scanBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.copper,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scanBtnPrimaryText: {
    fontFamily: fonts.body.bold,
    fontSize: 14.5,
    color: colors.white,
  },
  scanBtnPrimarySub: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontFamily: fonts.body.semibold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: colors.textLight,
  },
  emailHint: {
    ...typography.bodyXs,
    color: colors.textLight,
    lineHeight: 16,
    marginTop: -4,
  },
  formStack: {
    gap: spacing.sm,
  },
  messageInput: {
    minHeight: 90,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  planSummary: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgInput,
    gap: spacing.xs,
  },
  planEyebrow: {
    ...typography.label,
    color: colors.textLight,
  },
  planTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
  },
  planText: {
    ...typography.bodySm,
    color: colors.textMid,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textLight,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
