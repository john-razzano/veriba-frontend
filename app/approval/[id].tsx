import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeforeAfterSlider } from '@/src/components/before-after-slider';
import { SignaturePad } from '@/src/components/signature-pad';
import { getApproval, invalidateApprovals, loadApprovals } from '@/src/lib/me';
import {
  respondToApproval,
  uploadApprovalPhoto,
  type ConsentDecision,
} from '@/src/lib/veriba-api';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { pickCapturedPhoto } from '@/src/utils/media';

// Options map 1:1 to ConsentTier (mockup C4).
const OPTIONS: {
  decision: ConsentDecision;
  title: string;
  detail: string;
  rewardKey: 'full' | 'full_blur' | 'partial' | null;
}[] = [
  {
    decision: 'full',
    title: 'Approve · show full photo',
    detail: 'Most credible. Your full before & after appears in discovery.',
    rewardKey: 'full',
  },
  {
    decision: 'full_blur',
    title: 'Approve · blur my eyes',
    detail: 'Identity protected, transformation still visible.',
    rewardKey: 'full_blur',
  },
  {
    decision: 'partial',
    title: 'Partial · after only',
    detail: 'Show the result; keep the before private.',
    rewardKey: 'partial',
  },
  {
    decision: 'decline',
    title: 'Decline',
    detail: "Don't publish. Stays private to the clinic record.",
    rewardKey: null,
  },
];

/** Consumer review & approve (mockup C4) — the in-app consent loop. */
export default function ApprovalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [approval, setApproval] = useState(id ? getApproval(id) : undefined);
  const [decision, setDecision] = useState<ConsentDecision>('full');
  const [signature, setSignature] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!approval && id) {
      loadApprovals(true)
        .then(() => setApproval(getApproval(id)))
        .catch(() => {});
    }
  }, [approval, id]);

  if (!approval) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.textMid} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.emptyText}>Approval not found — it may already be completed.</Text>
      </SafeAreaView>
    );
  }

  const needsAfterPhoto = !approval.session.after_image_url;
  const needsSignature = decision !== 'decline';
  const canConfirm = !submitting && (!needsSignature || signature !== null);

  const onAddPhoto = async (source: 'camera' | 'library') => {
    if (!id) return;
    try {
      const photo = await pickCapturedPhoto(source);
      if (!photo) return;
      setUploadingPhoto(true);
      const result = await uploadApprovalPhoto(id, photo);
      invalidateApprovals();
      setApproval((prev) =>
        prev
          ? {
              ...prev,
              session: {
                ...prev.session,
                after_image_url: result.session.after_image_url ?? prev.session.after_image_url,
                after_blurhash: result.session.after_blurhash ?? prev.session.after_blurhash,
              },
            }
          : prev
      );
    } catch (error) {
      Alert.alert(
        'Unable to add photo',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onConfirm = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const result = await respondToApproval(id, decision, signature);
      invalidateApprovals();
      const reward = result.reward_earned;
      Alert.alert(
        decision === 'decline' ? 'Response recorded' : 'Approved',
        decision === 'decline'
          ? 'Your photos will stay private to the clinic record.'
          : reward?.amount
            ? `Thank you! You earned a $${reward.amount} reward${reward.code ? ` (${reward.code})` : ''}.`
            : 'Thank you! Your consent has been recorded.',
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (error) {
      setSubmitting(false);
      Alert.alert(
        'Unable to submit',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={!signing}
        contentContainerStyle={styles.content}>
        <View style={styles.headRow}>
          <Pressable style={styles.backCircle} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={styles.heading}>Your approval</Text>
          <View style={styles.backCircle} />
        </View>

        {needsAfterPhoto ? (
          <>
            <Text style={styles.heroTitle}>
              Add your <Text style={styles.heroEm}>after photo</Text> to continue
            </Text>
            <Text style={styles.heroCopy}>
              {approval.practice.name} started a {approval.session.treatment.toLowerCase()}{' '}
              result but hasn't received your after photo yet. Add it here, then choose how it
              should appear.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.heroTitle}>
              How should your <Text style={styles.heroEm}>before & after</Text> appear?
            </Text>
            <Text style={styles.heroCopy}>
              {approval.practice.name} wants to publish your{' '}
              {approval.session.treatment.toLowerCase()} result. Drag to preview exactly what
              the public would see — you're in control.
            </Text>
          </>
        )}

        {approval.session.before_image_url && approval.session.after_image_url ? (
          <View style={styles.sliderWrap}>
            <BeforeAfterSlider
              beforeUri={approval.session.before_image_url}
              afterUri={approval.session.after_image_url}
              beforeBlurhash={approval.session.before_blurhash ?? undefined}
              afterBlurhash={approval.session.after_blurhash ?? undefined}
              height={230}
            />
          </View>
        ) : null}

        {needsAfterPhoto ? (
          <View style={styles.addPhotoBlock}>
            {approval.session.before_image_url ? (
              <View style={styles.beforePreview}>
                <Image
                  source={{ uri: approval.session.before_image_url }}
                  style={styles.beforePreviewImage}
                  contentFit="cover"
                  transition={150}
                  placeholder={
                    approval.session.before_blurhash
                      ? { blurhash: approval.session.before_blurhash }
                      : undefined
                  }
                  placeholderContentFit="cover"
                />
                <View style={styles.beforePreviewLabel}>
                  <Text style={styles.beforePreviewLabelText}>YOUR BASELINE ON FILE</Text>
                </View>
              </View>
            ) : null}

            <Pressable
              disabled={uploadingPhoto}
              style={[styles.addPhotoBtn, uploadingPhoto && styles.confirmDisabled]}
              onPress={() => void onAddPhoto('camera')}>
              <Ionicons name="camera-outline" size={17} color={colors.white} />
              <Text style={styles.addPhotoBtnText}>
                {uploadingPhoto ? 'Uploading…' : 'Take after photo'}
              </Text>
            </Pressable>
            <Pressable
              disabled={uploadingPhoto}
              style={[styles.addPhotoBtnOutline, uploadingPhoto && styles.confirmDisabled]}
              onPress={() => void onAddPhoto('library')}>
              <Ionicons name="images-outline" size={17} color={colors.text} />
              <Text style={styles.addPhotoBtnOutlineText}>Choose from library</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.optList}>
              {OPTIONS.map((option) => {
                const selected = decision === option.decision;
                const reward = option.rewardKey
                  ? approval.discount_offer[option.rewardKey]
                  : null;
                return (
                  <Pressable
                    key={option.decision}
                    onPress={() => setDecision(option.decision)}
                    style={[styles.opt, selected && styles.optSelected]}>
                    <View style={[styles.radio, selected && styles.radioSelected]} />
                    <View style={styles.optCopy}>
                      <Text style={styles.optTitle}>{option.title}</Text>
                      <Text style={styles.optDetail}>{option.detail}</Text>
                    </View>
                    {reward ? <Text style={styles.optReward}>${reward}</Text> : null}
                  </Pressable>
                );
              })}
            </View>

            {needsSignature ? (
              <View style={styles.sigBlock}>
                <Text style={styles.sigLabel}>SIGN TO CONFIRM</Text>
                <View style={styles.sigCard}>
                  <SignaturePad onChange={setSignature} onInteractionChange={setSigning} />
                </View>
              </View>
            ) : null}

            <Pressable disabled={!canConfirm} onPress={() => void onConfirm()}>
              <LinearGradient
                colors={[colors.copper, colors.brown, colors.teal]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.confirm, !canConfirm && styles.confirmDisabled]}>
                <Text style={styles.confirmText}>
                  {submitting
                    ? 'Submitting…'
                    : decision === 'decline'
                      ? 'Confirm decline'
                      : 'Confirm & sign approval'}
                </Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xl },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.md,
  },
  backText: { ...typography.bodySm, color: colors.textMid },
  heading: { fontFamily: fonts.display.medium, fontSize: 21, color: '#23201c' },
  heroTitle: {
    fontFamily: fonts.display.medium,
    fontSize: 22,
    lineHeight: 27,
    textAlign: 'center',
    color: '#23201c',
    paddingHorizontal: spacing.xl,
  },
  heroEm: { fontStyle: 'italic', color: colors.copper },
  heroCopy: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: 7,
    lineHeight: 19,
  },
  sliderWrap: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  addPhotoBlock: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  beforePreview: {
    height: 180,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgInput,
  },
  beforePreviewImage: { ...StyleSheet.absoluteFillObject },
  beforePreviewLabel: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(18,12,7,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  beforePreviewLabelText: {
    fontFamily: fonts.body.semibold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: colors.white,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.copper,
  },
  addPhotoBtnText: { fontFamily: fonts.body.bold, fontSize: 13, color: colors.white },
  addPhotoBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  addPhotoBtnOutlineText: { fontFamily: fonts.body.bold, fontSize: 13, color: colors.text },
  optList: { paddingHorizontal: spacing.md, marginTop: spacing.md, gap: 8 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 12,
  },
  optSelected: {
    borderColor: colors.copper,
    backgroundColor: colors.warningBg,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: {
    borderColor: colors.copper,
    backgroundColor: colors.copper,
  },
  optCopy: { flex: 1 },
  optTitle: { fontFamily: fonts.body.bold, fontSize: 12, color: colors.text },
  optDetail: { ...typography.bodyXs, color: colors.textLight, marginTop: 2, lineHeight: 15 },
  optReward: { fontFamily: fonts.display.semibold, fontSize: 16, color: colors.copper },
  sigBlock: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sigLabel: { ...typography.label, color: colors.textLight, marginBottom: 8 },
  sigCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  confirm: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: { opacity: 0.45 },
  confirmText: { fontFamily: fonts.body.bold, fontSize: 13, color: colors.white },
  emptyText: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    paddingTop: 40,
    paddingHorizontal: spacing.xl,
  },
});
