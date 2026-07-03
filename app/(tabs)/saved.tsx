import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaseTile } from '@/src/components/case-tile';
import { AvatarBadge } from '@/src/components/ui';
import type { FeedCase } from '@/src/data/mock-feed';
import { galleryClinics, loadFeedCases, type GalleryClinic } from '@/src/lib/gallery';
import { colors, fonts, spacing, typography } from '@/src/theme';

type SavedTab = 'cases' | 'clinics';

/**
 * Consumer saved (mockup C7). Saves/follows don't exist server-side yet, so
 * this shows a sample of live gallery cases as stand-in bookmarks.
 */
export default function SavedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SavedTab>('cases');
  const [cases, setCases] = useState<FeedCase[]>([]);
  const [clinics, setClinics] = useState<GalleryClinic[]>([]);

  useEffect(() => {
    loadFeedCases()
      .then((all) => {
        setCases(all.slice(0, 6));
        setClinics(galleryClinics(all));
      })
      .catch(() => {});
  }, []);

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
        ) : (
          clinics.map((clinic) => (
            <View key={clinic.name} style={styles.clinicRow}>
              <AvatarBadge initials={clinic.initials} size={42} />
              <View style={styles.clinicMeta}>
                <Text style={styles.clinicName}>{clinic.name}</Text>
                <Text style={styles.clinicSub}>
                  {clinic.location} · {clinic.caseCount} verified results
                </Text>
              </View>
              <Pressable style={styles.savedBtn}>
                <Text style={styles.savedText}>Saved</Text>
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
});
