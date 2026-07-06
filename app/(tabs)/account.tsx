import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

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

      {user?.id ? (
        <SectionCard>
          <View style={styles.qrRow}>
            <View style={styles.qrCopy}>
              <Text style={styles.qrTitle}>My clinic code</Text>
              <Text style={styles.qrText}>
                Show this at your clinic — they scan it to link your treatment to your
                Veriba account, so updates reach this phone.
              </Text>
            </View>
            <View style={styles.qrBox}>
              <QRCode
                value={`veriba:member:${user.id}`}
                size={92}
                color={colors.text}
                backgroundColor="transparent"
              />
            </View>
          </View>
        </SectionCard>
      ) : null}

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
      <View style={styles.providerHeader}>
        {practice?.avatarUrl ? (
          <Image
            source={{ uri: practice.avatarUrl }}
            style={styles.providerAvatar}
            transition={150}
          />
        ) : (
          <AvatarBadge initials={user?.initials ?? '…'} size={72} />
        )}
        <Text style={styles.providerName}>{practice?.name ?? 'Loading practice…'}</Text>
        <Text style={styles.providerSub}>
          {user?.name ?? ''}
          {user?.email ? ` · ${user.email}` : ''}
        </Text>
        <View style={styles.providerPill}>
          <Text style={styles.providerPillText}>PROVIDER</Text>
        </View>
      </View>

      <SectionCard>
        <Pressable
          onPress={() => router.push('/practice-profile' as Href)}
          style={styles.editPageRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Public page</Text>
            <Text style={styles.helper}>
              Edit your clinic's bio, photo, and booking link — as members see it.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
        </Pressable>
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
  providerHeader: {
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.md,
  },
  providerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgInput,
  },
  providerName: {
    fontFamily: fonts.display.medium,
    fontSize: 22,
    color: colors.text,
    marginTop: 4,
  },
  providerSub: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  providerPill: {
    backgroundColor: colors.warningBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 2,
  },
  providerPillText: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.copper,
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
  editPageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qrCopy: { flex: 1, gap: 5 },
  qrTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
  },
  qrText: {
    ...typography.bodyXs,
    color: colors.textMid,
    lineHeight: 16,
  },
  qrBox: {
    padding: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
