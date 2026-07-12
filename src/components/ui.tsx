import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, Pressable, ScrollView, SafeAreaView, StyleSheet, TextInput, type PressableProps, type ScrollViewProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, fonts, gradients, radii, shadows, spacing, typography } from '@/src/theme';
import { statusLabel } from '@/src/utils/format';
import type { SessionStatus } from '@/src/types';

export function ScreenScroll({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        {...props}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GradientButton({
  label,
  onPress,
  disabled,
  style,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={style}>
      {disabled ? (
        <View style={[styles.buttonBase, styles.buttonDisabled]}>
          <Text style={[styles.buttonText, styles.buttonTextDisabled, textStyle]}>{label}</Text>
        </View>
      ) : (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.buttonBase, shadows.copper]}>
          <Text style={[styles.buttonText, textStyle]}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  style,
  destructive,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.outlineButton, style]}>
      <Text style={[styles.outlineButtonText, destructive && { color: colors.error }]}>{label}</Text>
    </Pressable>
  );
}

// Compact labels for the dashboard tile overlay, where the pill sits atop a
// photo at ~110px wide — the full statusLabel() text wraps to two lines there.
const COMPACT_STATUS_LABELS: Partial<Record<SessionStatus, string>> = {
  pending_after: 'NEEDS PHOTO',
  pending_consent: 'NEEDS CONSENT',
  ready_to_publish: 'READY',
  unpublished: 'HIDDEN',
};

export function StatusPill({ status, compact }: { status: SessionStatus; compact?: boolean }) {
  // Opaque tints everywhere: these pills render both on plain white cards and
  // (compact mode) directly atop photos, where a translucent background loses
  // contrast against light images.
  const tone =
    status === 'published'
      ? { bg: colors.successBg, text: colors.success }
      : status === 'pending_after'
        ? { bg: colors.warningBg, text: colors.warning }
      : status === 'ready_to_publish'
        ? { bg: colors.tealBg, text: colors.teal }
      : status === 'pending_consent'
        ? { bg: colors.tealBg, text: colors.teal }
        : status === 'declined'
          ? { bg: colors.errorBg, text: colors.error }
        : { bg: colors.borderLight, text: colors.textLight };

  const label = (compact && COMPACT_STATUS_LABELS[status]) || statusLabel(status);

  return (
    <View style={[styles.pill, compact && styles.pillCompact, { backgroundColor: tone.bg }]}>
      <Text
        style={[styles.pillText, compact && styles.pillTextCompact, { color: tone.text }]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function AvatarBadge({
  initials,
  size = 42,
}: {
  initials: string;
  size?: number;
}) {
  return (
    <LinearGradient
      colors={gradients.subtle}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </LinearGradient>
  );
}

export function StatCard({
  value,
  label,
  trend,
}: {
  value: string;
  label: string;
  trend: string;
}) {
  return (
    <SectionCard style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statTrend}>{trend}</Text>
    </SectionCard>
  );
}

export function AppInput({
  style,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={colors.textLight} style={[styles.input, style]} {...props} />;
}

export function ChipButton({
  label,
  sublabel,
  active,
  onPress,
  style,
}: {
  label: string;
  sublabel?: string;
  active?: boolean;
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
        style,
      ]}>
      <Text style={[styles.chipTitle, active && styles.chipTitleActive]}>{label}</Text>
      {sublabel ? <Text style={[styles.chipText, active && styles.chipTextActive]}>{sublabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.md,
  },
  buttonBase: {
    minHeight: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  buttonTextDisabled: {
    color: colors.textLight,
  },
  outlineButton: {
    minHeight: 54,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgCard,
  },
  outlineButtonText: {
    ...typography.button,
    color: colors.text,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    ...typography.pill,
  },
  pillCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pillTextCompact: {
    fontSize: 7.5,
    letterSpacing: 0.3,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarText: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.copper,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statValue: {
    ...typography.stat,
    color: colors.text,
  },
  statLabel: {
    ...typography.label,
    color: colors.textLight,
    marginTop: 4,
  },
  statTrend: {
    fontFamily: fonts.body.medium,
    fontSize: 9,
    color: colors.success,
    marginTop: 6,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInput,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text,
  },
  chip: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  chipActive: {
    borderColor: colors.copper,
    backgroundColor: colors.warningBg,
  },
  chipTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
  },
  chipTitleActive: {
    color: colors.copper,
  },
  chipText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.textLight,
  },
  chipTextActive: {
    color: colors.textMid,
  },
});
