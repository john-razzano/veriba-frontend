import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaseTile } from '@/src/components/case-tile';
import { AvatarBadge } from '@/src/components/ui';
import type { FeedCase } from '@/src/data/mock-feed';
import { TRENDING_TREATMENTS } from '@/src/data/mock-feed';
import {
  galleryClinics,
  galleryTreatmentBuckets,
  loadFeedCases,
  searchCases,
  type GalleryClinic,
  type TreatmentBucket,
} from '@/src/lib/gallery';
import { ensureMemberState, isFollowed, toggleFollow } from '@/src/lib/me';
import { colors, fonts, spacing, typography } from '@/src/theme';

/**
 * Consumer search (mockup C6): live search + trending treatments,
 * browse-by-treatment mosaic (live gallery data), top clinics.
 */
export default function SearchScreen() {
  const router = useRouter();
  const [cases, setCases] = useState<FeedCase[]>([]);
  const [buckets, setBuckets] = useState<TreatmentBucket[]>([]);
  const [clinics, setClinics] = useState<GalleryClinic[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeedCase[] | null>(null);

  useEffect(() => {
    loadFeedCases()
      .then((all) => {
        setCases(all);
        setBuckets(galleryTreatmentBuckets(all).slice(0, 6));
        setClinics(galleryClinics(all));
      })
      .catch(() => {});
  }, []);

  // debounced live search against /api/gallery/sessions?query=
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      searchCases(trimmed)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const openTreatment = (treatment: string) => {
    const match =
      cases.find((c) => c.treatment.toLowerCase().includes(treatment.toLowerCase())) ??
      cases[0];
    if (match) router.push(`/case/${match.id}` as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Search</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.textLight} />
          <TextInput
            placeholder="Treatments, clinics, locations"
            placeholderTextColor={colors.textLight}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {results !== null ? (
          <>
            <Text style={styles.groupLabel}>
              {results.length === 0
                ? 'NO RESULTS'
                : `${results.length} RESULT${results.length === 1 ? '' : 'S'}`}
            </Text>
            <View style={styles.browseGrid}>
              {Array.from({ length: Math.ceil(results.length / 3) }, (_, row) => (
                <View key={row} style={styles.browseRow}>
                  {results.slice(row * 3, row * 3 + 3).map((c) => (
                    <CaseTile
                      key={c.id}
                      afterUri={c.afterUri}
                      blurhash={c.afterBlurhash}
                      treatment={c.treatment}
                      clinic={c.clinic}
                      labelVariant="small"
                      onPress={() => router.push(`/case/${c.id}` as Href)}
                    />
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
        <Text style={styles.groupLabel}>TRENDING</Text>
        <View style={styles.trend}>
          {TRENDING_TREATMENTS.map((t) => (
            <Pressable key={t} onPress={() => openTreatment(t)} style={styles.trendChip}>
              <Text style={styles.trendChipText}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.groupLabel}>BROWSE BY TREATMENT</Text>
        <View style={styles.browseGrid}>
          {[0, 1].map((row) => (
            <View key={row} style={styles.browseRow}>
              {buckets.slice(row * 3, row * 3 + 3).map((bucket) => (
                <CaseTile
                  key={bucket.treatment}
                  afterUri={bucket.imageUri}
                  blurhash={bucket.blurhash}
                  treatment={bucket.treatment}
                  clinic={`${bucket.caseCount} ${bucket.caseCount === 1 ? 'case' : 'cases'}`}
                  labelVariant="small"
                  onPress={() => openTreatment(bucket.treatment)}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.groupLabel}>TOP CLINICS NEAR YOU</Text>
        {clinics.map((clinic) => (
          <ClinicRow key={clinic.name} clinic={clinic} />
        ))}
          </>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ClinicRow({ clinic }: { clinic: GalleryClinic }) {
  const [following, setFollowing] = useState(
    clinic.practiceId ? isFollowed(clinic.practiceId) : false
  );

  useEffect(() => {
    void ensureMemberState()
      .then(() => {
        if (clinic.practiceId) setFollowing(isFollowed(clinic.practiceId));
      })
      .catch(() => {});
  }, [clinic.practiceId]);

  const onToggle = () => {
    if (!clinic.practiceId) return;
    const practiceId = clinic.practiceId;
    setFollowing((prev) => !prev);
    toggleFollow(practiceId).catch(() => setFollowing(isFollowed(practiceId)));
  };

  const router = useRouter();

  return (
    <Pressable
      style={styles.clinicRow}
      onPress={() =>
        clinic.practiceSlug ? router.push(`/clinic/${clinic.practiceSlug}` as Href) : undefined
      }>
      <AvatarBadge initials={clinic.initials} size={42} />
      <View style={styles.clinicMeta}>
        <Text style={styles.clinicName}>{clinic.name}</Text>
        <Text style={styles.clinicSub}>
          {clinic.location} · {clinic.caseCount} verified results
        </Text>
      </View>
      <Pressable
        style={[styles.followBtn, following && styles.followBtnActive]}
        onPress={onToggle}>
        <Text style={[styles.followText, following && styles.followTextActive]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      </Pressable>
    </Pressable>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: spacing.md,
    marginBottom: 14,
    height: 42,
    paddingHorizontal: 13,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text,
  },
  groupLabel: {
    ...typography.label,
    color: colors.textLight,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 9,
  },
  trend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  trendChip: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  trendChipText: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.text,
  },
  browseGrid: { paddingHorizontal: 2, paddingBottom: 10 },
  browseRow: { flexDirection: 'row', gap: 2, height: 108, marginBottom: 2 },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  clinicAvatar: { width: 42, height: 42, borderRadius: 11 },
  clinicMeta: { flex: 1 },
  clinicName: { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.text },
  clinicSub: { ...typography.bodyXs, color: colors.textLight, marginTop: 1 },
  followBtn: {
    borderWidth: 1,
    borderColor: colors.copper,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  followBtnActive: { backgroundColor: colors.copper },
  followText: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.copper },
  followTextActive: { color: colors.white },
});
