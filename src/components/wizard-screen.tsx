import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/src/components/ui';
import { colors, fonts, gradients, radii, spacing, typography } from '@/src/theme';

function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.dots}>
      {[1, 2, 3, 4].map((step) => (
        <View
          key={step}
          style={[
            styles.dot,
            step === current && styles.dotActive,
            step < current && styles.dotComplete,
          ]}
        />
      ))}
    </View>
  );
}

export function WizardScreen({
  step,
  children,
  continueLabel,
  onContinue,
  continueDisabled,
  scrollEnabled = true,
  scrollRef,
}: {
  step: number;
  children: React.ReactNode;
  continueLabel: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  scrollEnabled?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => (step === 1 ? router.replace('/(tabs)') : router.back())}
            style={styles.topButton}>
            <Ionicons name="chevron-back" size={16} color={colors.textMid} />
            <Text style={styles.topButtonText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
          </Pressable>
          <Text style={styles.stepMeta}>Step {step} of 4</Text>
        </View>
        <StepDots current={step} />
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <View style={styles.bottomBar}>
          <GradientButton
            label={continueLabel}
            onPress={onContinue}
            disabled={continueDisabled}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  wrapper: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  topButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.textMid,
  },
  stepMeta: {
    fontFamily: fonts.body.semibold,
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.copper,
  },
  dotComplete: {
    backgroundColor: colors.copper,
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
});
