import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AvatarBadge,
  ChipButton,
  OutlineButton,
  ScreenScroll,
  SectionCard,
} from '@/src/components/ui';
import { loadFollowedClinics, loadSavedCases } from '@/src/lib/me';
import { listMyResults } from '@/src/lib/veriba-api';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { DEFAULT_SERVICES_OFFERED, TREATMENTS } from '@/src/types';

export default function AccountScreen() {
  const isMember = useProveStore((state) => state.user?.role === 'member');

  return isMember ? <MemberAccount /> : <ProviderAccount />;
}

const MEMBER_MENU = [
  ['grid-outline', 'My before & afters'],
  ['bookmark-outline', 'Saved clinics'],
  ['lock-closed-outline', 'Privacy & consent'],
  ['settings-outline', 'Settings'],
] as const;

/** Consumer account (mockup C5). */
function MemberAccount() {
  const router = useRouter();
  const user = useProveStore((state) => state.user);
  const logout = useProveStore((state) => state.logout);
  const [counts, setCounts] = useState({ results: 0, saved: 0, following: 0 });

  useFocusEffect(
    useCallback(() => {
      void Promise.all([listMyResults(), loadSavedCases(), loadFollowedClinics()])
        .then(([results, saves, follows]) =>
          setCounts({
            results: results.total,
            saved: saves.length,
            following: follows.length,
          })
        )
        .catch(() => {});
    }, [])
  );

  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <View style={styles.memberHeader}>
        <AvatarBadge initials={user?.initials ?? '…'} size={72} />
        <Text style={styles.memberName}>{user?.name ?? 'Loading profile…'}</Text>
        <View style={styles.memberPill}>
          <Text style={styles.memberPillText}>MEMBER</Text>
        </View>
      </View>

      <SectionCard>
        <View style={styles.memberStats}>
          {(
            [
              [String(counts.results), 'My results'],
              [String(counts.saved), 'Saved'],
              [String(counts.following), 'Following'],
            ] as [string, string][]
          ).map(([value, label]) => (
            <View key={label} style={styles.memberStat}>
              <Text style={styles.memberStatValue}>{value}</Text>
              <Text style={styles.memberStatLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard style={styles.menuCard}>
        {MEMBER_MENU.map(([icon, label], index) => (
          <Pressable
            key={label}
            onPress={() =>
              label === 'My before & afters'
                ? router.push('/my-results' as Href)
                : label === 'Saved clinics'
                  ? router.push('/(tabs)/saved' as Href)
                  : Alert.alert(label, 'Coming soon.')
            }
            style={[styles.menuRow, index < MEMBER_MENU.length - 1 && styles.menuRowBorder]}>
            <Ionicons name={icon} size={17} color={colors.textMid} />
            <Text style={styles.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.textLight} />
          </Pressable>
        ))}
      </SectionCard>

      <Pressable
        onPress={() =>
          Alert.alert('Provider accounts', 'Sign up with "I\'m a clinic" to publish results.')
        }
        style={styles.switchCard}>
        <Ionicons name="swap-horizontal" size={21} color={colors.white} />
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>Are you a provider?</Text>
          <Text style={styles.switchSub}>Switch to clinic mode to publish results</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.white} />
      </Pressable>

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

function ProviderAccount() {
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
        <Text style={styles.footerText}>Version 1.0.0 (2)</Text>
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
  memberHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  memberName: {
    fontFamily: fonts.display.medium,
    fontSize: 22,
    color: colors.text,
  },
  memberPill: {
    backgroundColor: '#E5EBEE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  memberPillText: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.teal,
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  memberStat: {
    alignItems: 'center',
  },
  memberStatValue: {
    fontFamily: fonts.display.semibold,
    fontSize: 20,
    color: colors.text,
  },
  memberStatLabel: {
    ...typography.bodyXs,
    color: colors.textLight,
    marginTop: 1,
  },
  menuCard: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.teal,
    borderRadius: radii.lg,
    padding: 14,
  },
  switchCopy: {
    flex: 1,
  },
  switchTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 12.5,
    color: colors.white,
  },
  switchSub: {
    ...typography.bodyXs,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
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
