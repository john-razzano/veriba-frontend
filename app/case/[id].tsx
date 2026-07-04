import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeforeAfterSlider } from '@/src/components/before-after-slider';
import { getCachedCase, loadFeedCases } from '@/src/lib/gallery';
import { ensureMemberState, isFollowed, isSaved, toggleFollow, toggleSave } from '@/src/lib/me';
import { fetchPublicCaseStudy, type PublicCaseStudy } from '@/src/lib/veriba-api';
import { colors, fonts, radii, spacing } from '@/src/theme';
import { formatCompactDate } from '@/src/utils/format';

const CUSTODY = [
  { icon: 'camera-outline', label: 'CAPTURED' },
  { icon: 'shield-checkmark-outline', label: 'CONSENTED' },
  { icon: 'ribbon-outline', label: 'VERIFIED' },
] as const;

/**
 * Consumer post detail (redesign Phase 1, screen C2). Reads mock feed data for now;
 * Phase 4 merges this with the provider detail at app/session/[id].tsx.
 */
export default function CaseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState(id ? getCachedCase(id) : undefined);
  const [study, setStudy] = useState<PublicCaseStudy | null>(null);
  const [saved, setSaved] = useState(id ? isSaved(id) : false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPublicCaseStudy(id)
        .then((res) => setStudy(res.session))
        .catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    if (!data && id) {
      loadFeedCases()
        .then(() => setData(getCachedCase(id)))
        .catch(() => {});
    }
  }, [data, id]);

  useEffect(() => {
    void ensureMemberState()
      .then(() => {
        if (id) setSaved(isSaved(id));
        if (data?.practiceId) setFollowing(isFollowed(data.practiceId));
      })
      .catch(() => {});
  }, [id, data?.practiceId]);

  const onToggleSave = () => {
    if (!id) return;
    setSaved((prev) => !prev);
    toggleSave(id).catch(() => setSaved(isSaved(id)));
  };

  const onToggleFollow = () => {
    if (!data?.practiceId) return;
    const practiceId = data.practiceId;
    setFollowing((prev) => !prev);
    toggleFollow(practiceId).catch(() => setFollowing(isFollowed(practiceId)));
  };

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.textMid} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.empty}>Case not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View>
          <BeforeAfterSlider beforeUri={data.beforeUri} afterUri={data.afterUri} height={320} />
          <SafeAreaView edges={['top']} style={styles.floatTop} pointerEvents="box-none">
            <Pressable style={styles.floatBack} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color={colors.white} />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.clinRow}>
          <Pressable
            style={styles.who}
            onPress={() => {
              const slug = study?.practice?.widget_slug ?? data.practiceSlug;
              if (slug) router.push(`/clinic/${slug}` as never);
            }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{data.clinic.slice(0, 1)}</Text>
            </View>
            <View>
              <Text style={styles.clinName}>{data.clinic}</Text>
              <Text style={styles.clinSub}>{data.location ?? ''}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.follow, following && styles.followActive]}
            onPress={onToggleFollow}>
            <Text style={[styles.followText, following && styles.followTextActive]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{data.treatment}</Text>
        <Text style={styles.subtitle}>
          {study?.published_at
            ? `Published ${formatCompactDate(study.published_at)}${study.category ? ` · ${study.category}` : ''}`
            : (data.category ?? 'Verified result')}
        </Text>

        <View style={styles.custody}>
          {CUSTODY.map((c) => (
            <View key={c.label} style={styles.cstep}>
              <Ionicons name={c.icon} size={15} color={colors.success} />
              <Text style={styles.cstepLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        {study?.treatment_details ? (
          <Text style={styles.details}>{study.treatment_details}</Text>
        ) : null}

        <View style={styles.infoCard}>
          <Row
            k="Published"
            v={study?.published_at ? formatCompactDate(study.published_at) : '—'}
          />
          <Row
            k="Images verified"
            v={
              study?.chain_of_custody?.checkpoints
                ? `${study.chain_of_custody.checkpoints.length} checkpoints · hash-locked`
                : '2 · hash-locked'
            }
          />
          <Row k="Provider" v={study?.provider?.name ?? data.clinic} last />
        </View>

        <View style={styles.ctaRow}>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={onToggleSave}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={saved ? colors.copper : colors.text}
            />
            <Text style={[styles.btnGhostText, saved && { color: colors.copper }]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </Pressable>
          <Pressable style={styles.btnPrimaryWrap}>
            <LinearGradient
              colors={[colors.copper, colors.brown, colors.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}>
              <Ionicons name="calendar-outline" size={16} color={colors.white} />
              <Text style={styles.btnPrimaryText}>Book consult</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={[styles.irow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.irowK}>{k}</Text>
      <Text style={styles.irowV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  floatTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  floatBack: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  backText: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.textMid },
  empty: { fontFamily: fonts.body.regular, color: colors.textLight, padding: spacing.md },
  clinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 9,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.copper },
  clinName: { fontFamily: fonts.body.bold, fontSize: 13.5, color: colors.text },
  clinSub: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textLight, marginTop: 1 },
  follow: {
    backgroundColor: colors.copper,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.copper,
  },
  followActive: {
    backgroundColor: 'transparent',
  },
  followText: { fontFamily: fonts.body.bold, fontSize: 11, color: colors.white },
  followTextActive: { color: colors.copper },
  title: {
    fontFamily: fonts.display.medium,
    fontSize: 23,
    color: '#23201c',
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 11.5,
    color: colors.textMid,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  details: {
    fontFamily: fonts.body.regular,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textMid,
    paddingHorizontal: spacing.md,
    paddingBottom: 13,
  },
  custody: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingBottom: 13 },
  cstep: {
    flex: 1,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: '#D6E8DD',
    borderRadius: radii.md,
    paddingVertical: 7,
    alignItems: 'center',
  },
  cstepLabel: {
    fontFamily: fonts.body.bold,
    fontSize: 8,
    letterSpacing: 0.3,
    color: colors.success,
    marginTop: 3,
  },
  infoCard: {
    marginHorizontal: spacing.md,
    marginBottom: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },
  irow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  irowK: { fontFamily: fonts.body.regular, fontSize: 11.5, color: colors.textLight },
  irowV: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: colors.text },
  ctaRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, paddingTop: 2 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  btnGhost: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { fontFamily: fonts.body.bold, fontSize: 12.5, color: colors.text },
  btnPrimaryWrap: { flex: 1, borderRadius: radii.lg, overflow: 'hidden' },
  btnPrimaryText: { fontFamily: fonts.body.bold, fontSize: 12.5, color: colors.white },
});
