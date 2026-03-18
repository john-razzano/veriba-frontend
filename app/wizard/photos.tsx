import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/src/components/ui';
import { PhotoSlot } from '@/src/components/photo-preview';
import { WizardScreen } from '@/src/components/wizard-screen';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { pickCapturedPhoto } from '@/src/utils/media';
import { useProveStore } from '@/src/store/prove-store';

export default function PhotosStepScreen() {
  const router = useRouter();
  const wizard = useProveStore((state) => state.wizard);
  const setWizardStep = useProveStore((state) => state.setWizardStep);
  const setWizardPhoto = useProveStore((state) => state.setWizardPhoto);
  const setWizardPatientInitials = useProveStore((state) => state.setWizardPatientInitials);
  const [loadingSlot, setLoadingSlot] = useState<'before' | 'after' | null>(null);

  useEffect(() => {
    setWizardStep(2);
  }, [setWizardStep]);

  if (!wizard.treatment) {
    return <Redirect href="/wizard/treatment" />;
  }

  const openPicker = (slot: 'before' | 'after') => {
    Alert.alert(`Add ${slot === 'before' ? 'Before' : 'After'} Photo`, 'Choose a source', [
      {
        text: 'Capture',
        onPress: () => void selectPhoto(slot, 'camera'),
      },
      {
        text: 'Photo Library',
        onPress: () => void selectPhoto(slot, 'library'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const selectPhoto = async (slot: 'before' | 'after', source: 'camera' | 'library') => {
    try {
      setLoadingSlot(slot);
      const photo = await pickCapturedPhoto(source);
      if (!photo) {
        return;
      }

      setWizardPhoto(slot, photo);
      Alert.alert('Photo added', 'Hash, timestamp, and location were captured for chain of custody.');
    } catch (error) {
      Alert.alert('Unable to add photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoadingSlot(null);
    }
  };

  return (
    <WizardScreen
      step={2}
      continueLabel="Continue"
      continueDisabled={!wizard.beforePhoto || !wizard.afterPhoto}
      onContinue={() => router.push('/wizard/consent')}>
      <Text style={styles.title}>Upload Photos</Text>
      <Text style={styles.subtitle}>
        <Text style={styles.treatment}>{wizard.treatment}</Text>
      </Text>

      <View style={styles.photoRow}>
        <PhotoCaptureCard
          label="Before"
          filled={Boolean(wizard.beforePhoto)}
          loading={loadingSlot === 'before'}
          onPress={() => openPicker('before')}>
          {wizard.beforePhoto ? (
            <PhotoSlot
              label="Before"
              uri={wizard.beforePhoto.uri}
              obscuration={wizard.beforeObscuration}
              seed={`${wizard.treatment}-before`}
            />
          ) : null}
        </PhotoCaptureCard>
        <PhotoCaptureCard
          label="After"
          filled={Boolean(wizard.afterPhoto)}
          loading={loadingSlot === 'after'}
          onPress={() => openPicker('after')}>
          {wizard.afterPhoto ? (
            <PhotoSlot
              label="After"
              uri={wizard.afterPhoto.uri}
              obscuration={wizard.afterObscuration}
              seed={`${wizard.treatment}-after`}
            />
          ) : null}
        </PhotoCaptureCard>
      </View>

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
  filled,
  loading,
  onPress,
  children,
}: {
  label: string;
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
            <Text style={styles.captureLabel}>{label}</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>
        </>
      ) : (
        <View style={styles.captureEmpty}>
          <Ionicons name="camera-outline" size={22} color={colors.textLight} />
          <Text style={styles.captureEmptyLabel}>{loading ? 'Opening...' : label}</Text>
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
    marginBottom: spacing.lg,
  },
  treatment: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.copper,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  captureCard: {
    flex: 1,
    minHeight: 230,
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
    minHeight: 170,
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
  fieldLabel: {
    ...typography.label,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
});
