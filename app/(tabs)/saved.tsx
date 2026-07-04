import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaseTile } from '@/src/components/case-tile';
import { AvatarBadge } from '@/src/components/ui';
import type { FeedCase } from '@/src/data/mock-feed';
import { loadFollowedClinics, loadSavedCases, toggleFollow } from '@/src/lib/me';
import type { PublicPracticeCard } from '@/src/lib/veriba-api';
import { colors, fonts, spacing, typography } from '@/src/theme';

type SavedTab = 'cases' | 'clinics';

/** Consumer saved (mockup C7): the member's real bookmarks and followed clinics. */
export default function SavedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SavedTab>('cases');
  const [cases, setCases] = useState<FeedCase[]>([]);
  const [clinics, setClinics] = useState<PublicPracticeCard[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadSavedCases().then(setCases).catch(() => {});
      loadFollowedClinics().then(setClinics).catch(() => {});
    }, [])
  );

  const onUnfollow = (practiceId: string) => {
    setClinics((prev) => prev.filter((p) => p.id !== practiceId));
    toggleFollow(practiceId).catch(() =>
      loadFollowedClinics().then(setClinics).catch(() => {})
    );
  };

  const rows: FeedCase[][] = [];
  for (let i = 0; i < cases.length; i += 2) {
    rows.push(cases.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Saved</Text>

        <View style={styles.seg}>
          {(
            [
              ['cases', 'Cases'],
              ['clinics', 'Clinics'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              style={[styles.segItem, tab === value && styles.segItemOn]}>
              <Text style={[styles.segText, tab === value && styles.segTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'cases' ? (
          cases.length === 0 ? (
            <Text style={styles.empty}>
              Nothing saved yet — tap the bookmark on any case to keep it here.
            </Text>
          ) : (
            <View style={styles.grid}>
              {rows.map((row, i) => (
                <View key={i} style={styles.gridRow}>
                  {row.map((c) => (
                    <CaseTile
                      key={c.id}
                      afterUri={c.afterUri}
                      treatment={c.treatment}
                      clinic={c.clinic}
                      onPress={() => router.push(`/case/${c.id}` as Href)}
                    />
                  ))}
                </View>
              ))}
            </View>
          )
        ) : clinics.length === 0 ? (
          <Text style={styles.empty}>
            No clinics yet — follow one from a case or from Search.
          </Text>
        ) : (
          clinics.map((clinic) => (
            <View key={clinic.id} style={styles.clinicRow}>
              <AvatarBadge
                initials={clinic.provider_initials ?? clinic.name.slice(0, 2).toUpperCase()}
                size={42}
              />
              <View style={styles.clinicMeta}>
                <Text style={styles.clinicName}>{clinic.name}</Text>
                <Text style={styles.clinicSub}>
                  {clinic.location} · {clinic.published_session_count ?? 0} verified results
                </Text>
              </View>
              <Pressable style={styles.savedBtn} onPress={() => onUnfollow(clinic.id)}>
                <Text style={styles.savedText}>Following</Text>
              </Pressable>
            </View>
          ))
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  heading: {
    fontFamily: fonts.display.medium,
    fontSize: 24,
    color: '#23201c',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 12,
  },
  seg: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: 12,
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    padding: 3,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segItemOn: {
    backgroundColor: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  segText: { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.textMid },
  segTextOn: { color: colors.white },
  grid: { paddingHorizontal: 2 },
  gridRow: { flexDirection: 'row', gap: 2, height: 120, marginBottom: 2 },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  clinicMeta: { flex: 1 },
  clinicName: { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.text },
  clinicSub: { ...typography.bodyXs, color: colors.textLight, marginTop: 1 },
  savedBtn: {
    borderWidth: 1,
    borderColor: colors.copper,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  savedText: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.copper },
  empty: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    lineHeight: 20,
  },
});
