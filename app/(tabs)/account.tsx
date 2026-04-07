import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AvatarBadge,
  ChipButton,
  OutlineButton,
  ScreenScroll,
  SectionCard,
} from '@/src/components/ui';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { DEFAULT_SERVICES_OFFERED, TREATMENTS } from '@/src/types';

export default function AccountScreen() {
  const router = useRouter();
  const practice = useProveStore((state) => state.practice);
  const user = useProveStore((state) => state.user);
  const logout = useProveStore((state) => state.logout);
  const bootstrap = useProveStore((state) => state.bootstrap);
  const togglePracticeService = useProveStore((state) => state.togglePracticeService);
  const resetPracticeServices = useProveStore((state) => state.resetPracticeServices);

  useEffect(() => {
    if (!practice || !user) {
      void bootstrap().catch(() => {});
    }
  }, [bootstrap, practice, user]);

  const widgetSnippet = practice?.widgetSlug
    ? `<script src="https://prove.agence.studio/widget/${practice.widgetSlug}.js"></script>`
    : '<script src="https://prove.agence.studio/widget/your-practice.js"></script>';

  const copySnippet = async () => {
    await Clipboard.setStringAsync(widgetSnippet);
    Alert.alert('Copied', 'Widget snippet copied to the clipboard.');
  };

  const handleToggleService = (treatment: string) => {
    if (
      practice?.servicesOffered.includes(treatment) &&
      practice.servicesOffered.length === 1
    ) {
      Alert.alert(
        'At least one service required',
        'Keep at least one service enabled for the treatment picker.'
      );
      return;
    }

    togglePracticeService(treatment);
  };

  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <SectionCard>
        <View style={styles.profileRow}>
          <AvatarBadge initials={user?.initials ?? '…'} size={56} />
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{user?.name ?? 'Loading profile…'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? 'Fetching account data'}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Practice Settings</Text>
        {[
          ['Practice Name', practice?.name ?? 'Loading…'],
          ['Location', practice?.location ?? 'Loading…'],
          ['Website', practice?.website?.replace(/^https?:\/\//, '') ?? 'Loading…'],
          ['Default Discount (Full)', practice ? `$${practice.defaultDiscounts.full}` : '—'],
          ['Default Discount (Partial)', practice ? `$${practice.defaultDiscounts.partial}` : '—'],
          ['Default Discount (Full Blur)', practice ? `$${practice.defaultDiscounts.fullBlur}` : '—'],
        ].map(([label, value]) => (
          <Pressable
            key={label}
            onPress={() =>
              Alert.alert(
                'Read-only for now',
                'Tap to edit — inline editing coming soon.'
              )
            }
            style={styles.settingRow}>
            <Text style={styles.settingLabel}>{label}</Text>
            <Text style={styles.settingValue}>{value}</Text>
          </Pressable>
        ))}
      </SectionCard>

      <SectionCard>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <Text style={styles.helper}>
              Filter which treatments appear in the session wizard.
            </Text>
          </View>
          <Pressable onPress={resetPracticeServices}>
            <Text style={styles.actionText}>Reset Defaults</Text>
          </Pressable>
        </View>
        <Text style={styles.serviceCount}>
          {practice?.servicesOffered.length ?? 0} enabled · default set is {DEFAULT_SERVICES_OFFERED.length}
        </Text>
        <View style={styles.serviceList}>
          {TREATMENTS.map((option) => {
            const enabled = practice?.servicesOffered.includes(option.label) ?? false;

            return (
              <ChipButton
                key={option.label}
                label={option.label}
                sublabel={`${option.category} · ${enabled ? 'Shown in step 1' : 'Hidden from step 1'}`}
                active={enabled}
                onPress={() => handleToggleService(option.label)}
                style={styles.fullWidthChip}
              />
            );
          })}
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Website Widget</Text>
        <Text style={styles.helper}>
          Add this snippet to any page to display your verified gallery.
        </Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeText}>{widgetSnippet}</Text>
        </View>
        <OutlineButton label="Copy Snippet" onPress={copySnippet} />
      </SectionCard>

      <View style={styles.footerMeta}>
        <Text style={styles.footerText}>© 2026 Agence Studio</Text>
        <Text style={styles.footerText}>Version 1.0 (1)</Text>
      </View>

      <OutlineButton
        label="Logout"
        onPress={() => {
          void logout().finally(() => {
            router.replace('/(auth)/login');
          });
        }}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileMeta: {
    gap: 4,
  },
  profileName: {
    fontFamily: fonts.display.light,
    fontSize: 24,
    color: colors.text,
  },
  profileEmail: {
    ...typography.bodySm,
    color: colors.textLight,
  },
  sectionTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  actionText: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.copper,
  },
  settingRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 4,
  },
  settingLabel: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  settingValue: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text,
  },
  helper: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  serviceCount: {
    ...typography.bodyXs,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  serviceList: {
    gap: spacing.sm,
  },
  fullWidthChip: {
    width: '100%',
  },
  codeCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.bgInput,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  codeText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.textMid,
  },
  footerMeta: {
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    ...typography.bodyXs,
    color: colors.textLight,
    textAlign: 'center',
  },
});
