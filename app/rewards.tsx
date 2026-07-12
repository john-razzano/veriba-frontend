import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listMyRewards, type MyRewardCard } from '@/src/lib/veriba-api';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { formatCompactDate } from '@/src/utils/format';

const STATUS_STYLE: Record<MyRewardCard['status'], { label: string; bg: string; tint: string }> = {
  active: { label: 'Ready to use', bg: colors.warningBg, tint: colors.copper },
  redeemed: { label: 'Redeemed', bg: colors.successBg, tint: colors.success },
  expired: { label: 'Expired', bg: colors.bgInput, tint: colors.textLight },
  voided: { label: 'Voided', bg: colors.bgInput, tint: colors.textLight },
};

/** Member's earned discount codes across all clinics (GROWTH-SPEC §9). */
export default function RewardsScreen() {
  const router = useRouter();
  const [rewards, setRewards] = useState<MyRewardCard[] | null>(null);

  useEffect(() => {
    listMyRewards()
      .then((res) => setRewards(res.credits))
      .catch(() => setRewards([]));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headRow}>
        <Pressable style={styles.backCircle} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.heading}>My rewards</Text>
        <View style={styles.backCircle} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {rewards === null ? null : rewards.length === 0 ? (
          <Text style={styles.empty}>
            Nothing here yet — when you approve a before & after for publishing, your
            clinic's thank-you reward shows up here.
          </Text>
        ) : (
          rewards.map((reward) => {
            const status = STATUS_STYLE[reward.status];
            const thumb = reward.session.after_image_url;
            return (
              <View key={reward.id} style={styles.card}>
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Ionicons name="image-outline" size={18} color={colors.textLight} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.amount}>${reward.amount}</Text>
                    <View style={[styles.pill, { backgroundColor: status.bg }]}>
                      <Text style={[styles.pillText, { color: status.tint }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.desc}>{reward.description}</Text>
                  <Text style={styles.practice}>
                    {reward.practice.name} · {reward.session.treatment}
                  </Text>
                  {reward.status === 'active' ? (
                    <View style={styles.codeRow}>
                      <Text style={styles.codeLabel}>SHOW THIS CODE AT CHECKOUT</Text>
                      <Text style={styles.code}>{reward.code}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.meta}>
                    {reward.status === 'redeemed' && reward.redeemed_at
                      ? `Redeemed ${formatCompactDate(reward.redeemed_at)}`
                      : reward.status === 'active'
                        ? `Expires ${formatCompactDate(reward.expires_at)}`
                        : `Earned ${formatCompactDate(reward.earned_at)}`}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { fontFamily: fonts.display.medium, fontSize: 20, color: '#23201c' },
  content: { paddingHorizontal: spacing.md, gap: 12 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.bgInput },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontFamily: fonts.display.semibold, fontSize: 19, color: colors.text },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontFamily: fonts.body.semibold, fontSize: 9.5, letterSpacing: 0.3 },
  desc: { fontFamily: fonts.body.medium, fontSize: 12.5, color: colors.text },
  practice: { ...typography.bodyXs, color: colors.textMid },
  codeRow: {
    marginTop: 6,
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 9,
    gap: 1,
  },
  codeLabel: {
    fontFamily: fonts.body.semibold,
    fontSize: 8,
    letterSpacing: 0.6,
    color: colors.textLight,
  },
  code: {
    fontFamily: fonts.body.bold,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.copper,
  },
  meta: { ...typography.bodyXs, color: colors.textLight, marginTop: 3 },
  empty: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    lineHeight: 20,
  },
});
