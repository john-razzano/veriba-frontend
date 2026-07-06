import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaseTile } from '@/src/components/case-tile';
import { AvatarBadge } from '@/src/components/ui';
import type { FeedCase } from '@/src/data/mock-feed';
import { mapCardToFeedCase } from '@/src/lib/gallery';
import { ensureMemberState, isFollowed, toggleFollow } from '@/src/lib/me';
import { fetchPublicPractice, type PublicPracticeCard } from '@/src/lib/veriba-api';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, spacing, typography } from '@/src/theme';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

/** Collapse identical consecutive day hours: Mon–Fri 9:00–17:00 · Sat 10:00–14:00. */
function formatHours(hours: Record<string, string | null>): string[] {
  const runs: { start: string; end: string; value: string | null }[] = [];
  for (const day of DAY_ORDER) {
    const value = hours[day] ?? null;
    const last = runs[runs.length - 1];
    if (last && last.value === value) {
      last.end = day;
    } else {
      runs.push({ start: day, end: day, value });
    }
  }
  return runs
    .filter((r) => r.value)
    .map((r) =>
      r.start === r.end
        ? `${DAY_LABELS[r.start]} ${r.value}`
        : `${DAY_LABELS[r.start]}–${DAY_LABELS[r.end]} ${r.value}`
    );
}

/** Public clinic profile: identity, follow, and every published case. */
export default function ClinicScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [practice, setPractice] = useState<PublicPracticeCard | null>(null);
  const [cases, setCases] = useState<FeedCase[]>([]);
  const [failed, setFailed] = useState(false);
  const [following, setFollowing] = useState(false);
  const isMember = useProveStore((state) => state.user?.role === 'member');

  useEffect(() => {
    if (!slug) return;
    fetchPublicPractice(slug)
      .then((res) => {
        setPractice(res.practice);
        setCases(res.sessions.map(mapCardToFeedCase).filter((c): c is FeedCase => c !== null));
        return ensureMemberState().then(() => setFollowing(isFollowed(res.practice.id)));
      })
      .catch(() => setFailed(true));
  }, [slug]);

  const onToggleFollow = () => {
    if (!practice) return;
    setFollowing((prev) => !prev);
    toggleFollow(practice.id).catch(() => setFollowing(isFollowed(practice.id)));
  };

  const website = practice?.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const rows: FeedCase[][] = [];
  for (let i = 0; i < cases.length; i += 2) {
    rows.push(cases.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headRow}>
        <Pressable style={styles.backCircle} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <View style={styles.backCircle} />
      </View>

      {failed ? (
        <Text style={styles.empty}>This clinic doesn't have a public page yet.</Text>
      ) : !practice ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.copper} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.profile}>
            {practice.avatar_url ? (
              <Image
                source={{ uri: practice.avatar_url }}
                style={styles.avatarImg}
                transition={150}
                placeholder={
                  practice.avatar_blurhash ? { blurhash: practice.avatar_blurhash } : undefined
                }
                placeholderContentFit="cover"
              />
            ) : (
              <AvatarBadge
                initials={practice.provider_initials ?? practice.name.slice(0, 2).toUpperCase()}
                size={72}
              />
            )}
            <Text style={styles.name}>{practice.name}</Text>
            <Text style={styles.sub}>
              {practice.location}
              {practice.provider_name && practice.provider_name !== practice.name
                ? ` · ${practice.provider_name}`
                : ''}
            </Text>
            <Text style={styles.count}>
              {(practice.published_session_count ?? cases.length).toString()} VERIFIED RESULTS
            </Text>

            {practice.bio ? <Text style={styles.bio}>{practice.bio}</Text> : null}

            {practice.services?.length ? (
              <View style={styles.services}>
                {practice.services.map((service) => (
                  <View key={service} style={styles.serviceChip}>
                    <Text style={styles.serviceText}>{service}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={[styles.followBtn, following && styles.followBtnActive]}
                onPress={onToggleFollow}>
                <Text style={[styles.followText, following && styles.followTextActive]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
              {practice.booking_url ? (
                <Pressable
                  style={styles.followBtn}
                  onPress={() => void Linking.openURL(practice.booking_url as string)}>
                  <Text style={styles.followText}>Book consult</Text>
                </Pressable>
              ) : null}
              {isMember ? (
                <Pressable
                  style={styles.iconBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/consult-request',
                      params: { practiceId: practice.id, practiceName: practice.name },
                    } as Href)
                  }>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.text} />
                </Pressable>
              ) : null}
              {website ? (
                <Pressable
                  style={styles.siteBtn}
                  onPress={() => void Linking.openURL(`https://${website}`)}>
                  <Ionicons name="globe-outline" size={13} color={colors.text} />
                  <Text style={styles.siteText}>{website}</Text>
                </Pressable>
              ) : null}
            </View>

            {practice.hours || practice.location ? (
              <View style={styles.visitCard}>
                {practice.hours
                  ? formatHours(practice.hours).map((line) => (
                      <View key={line} style={styles.visitRow}>
                        <Ionicons name="time-outline" size={13} color={colors.textLight} />
                        <Text style={styles.visitText}>{line}</Text>
                      </View>
                    ))
                  : null}
                <Pressable
                  style={styles.visitRow}
                  onPress={() =>
                    void Linking.openURL(
                      `https://maps.apple.com/?q=${encodeURIComponent(
                        `${practice.name}, ${practice.location}`
                      )}`
                    )
                  }>
                  <Ionicons name="location-outline" size={13} color={colors.copper} />
                  <Text style={[styles.visitText, styles.visitLink]}>
                    {practice.location} · Open in Maps
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {practice.featured_image_url ? (
            <>
              <Text style={styles.gridLabel}>FEATURED</Text>
              <View style={styles.featuredWrap}>
                <CaseTile
                  afterUri={practice.featured_image_url}
                  treatment={practice.featured_treatment ?? ''}
                  clinic={practice.name}
                  onPress={() => {
                    const match = cases.find(
                      (c) => c.afterUri === practice.featured_image_url
                    );
                    if (match) router.push(`/case/${match.id}` as Href);
                  }}
                />
              </View>
            </>
          ) : null}

          <Text style={styles.gridLabel}>RESULTS</Text>
          {rows.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((c) => (
                <CaseTile
                  key={c.id}
                  afterUri={c.afterUri}
                  blurhash={c.afterBlurhash}
                  treatment={c.treatment}
                  clinic={c.category ?? ''}
                  onPress={() => router.push(`/case/${c.id}` as Href)}
                />
              ))}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { paddingTop: 80, alignItems: 'center' },
  profile: { alignItems: 'center', paddingTop: 4, paddingHorizontal: spacing.xl },
  name: {
    fontFamily: fonts.display.medium,
    fontSize: 24,
    color: '#23201c',
    marginTop: 10,
  },
  sub: { ...typography.bodySm, color: colors.textMid, marginTop: 3 },
  avatarImg: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bgInput },
  bio: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 10,
  },
  count: {
    fontFamily: fonts.body.semibold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textLight,
    marginTop: 7,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  serviceChip: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceText: { fontFamily: fonts.body.semibold, fontSize: 10.5, color: colors.textMid },
  featuredWrap: { height: 210, marginHorizontal: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  followBtn: {
    backgroundColor: colors.copper,
    borderWidth: 1,
    borderColor: colors.copper,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  followBtnActive: { backgroundColor: 'transparent' },
  followText: { fontFamily: fonts.body.bold, fontSize: 12, color: colors.white },
  followTextActive: { color: colors.copper },
  iconBtn: {
    width: 33,
    height: 33,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
    gap: 6,
  },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  visitText: { ...typography.bodyXs, color: colors.textMid },
  visitLink: { color: colors.copper, fontFamily: fonts.body.semibold },
  siteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  siteText: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.text },
  gridLabel: {
    ...typography.label,
    color: colors.textLight,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
    height: 150,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  empty: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
});
