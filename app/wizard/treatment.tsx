import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppInput, ChipButton } from '@/src/components/ui';
import { WizardScreen } from '@/src/components/wizard-screen';
import { DEFAULT_SERVICES_OFFERED } from '@/src/types';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { TREATMENTS } from '@/src/types';
import { useProveStore } from '@/src/store/prove-store';

export default function TreatmentStepScreen() {
  const router = useRouter();
  const practice = useProveStore((state) => state.practice);
  const wizard = useProveStore((state) => state.wizard);
  const setWizardStep = useProveStore((state) => state.setWizardStep);
  const setWizardTreatment = useProveStore((state) => state.setWizardTreatment);
  const [query, setQuery] = useState('');
  const availableServiceLabels = practice?.servicesOffered ?? [...DEFAULT_SERVICES_OFFERED];

  useEffect(() => {
    setWizardStep(1);
  }, [setWizardStep]);

  const availableTreatments = useMemo(
    () => TREATMENTS.filter((option) => availableServiceLabels.includes(option.label)),
    [availableServiceLabels]
  );

  const filtered = useMemo(
    () =>
      availableTreatments.filter((option) =>
        option.label.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [availableTreatments, query]
  );

  return (
    <WizardScreen
      step={1}
      continueLabel="Continue"
      continueDisabled={!wizard.treatment || !availableServiceLabels.includes(wizard.treatment)}
      onContinue={() => router.push('/wizard/photos')}>
      <Text style={styles.title}>Select Treatment</Text>
      <Text style={styles.subtitle}>What procedure was performed?</Text>
      <AppInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search treatments..."
        style={styles.search}
      />
      <Text style={styles.helper}>
        This list comes from the services enabled in Account Settings.
      </Text>
      <View style={styles.list}>
        {filtered.map((option) => (
          <ChipButton
            key={option.label}
            label={option.label}
            sublabel={option.category}
            active={wizard.treatment === option.label}
            onPress={() => setWizardTreatment(option.label, option.category)}
          />
        ))}
      </View>
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textLight,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  search: {
    marginBottom: spacing.md,
  },
  helper: {
    ...typography.bodyXs,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
