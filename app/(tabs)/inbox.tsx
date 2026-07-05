import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeforeAfterSlider } from '@/src/components/before-after-slider';
import { loadApprovals } from '@/src/lib/me';
import {
  listMyActivity,
  type ActivityItem,
  type ActivityKind,
  type ApprovalItem,
} from '@/src/lib/veriba-api';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { formatCompactDate } from '@/src/utils/format';

const ACTIVITY_ICONS: Record<ActivityKind, { name: string; bg: string; tint: string }> = {
  approval_completed: { name: 'shield-checkmark-outline', bg: colors.successBg, tint: colors.success },
  case_published: { name: 'megaphone-outline', bg: colors.warningBg, tint: colors.copper },
  credit_earned: { name: 'gift-outline', bg: colors.successBg, tint: colors.success },
  credit_expiring: { name: 'time-outline', bg: colors.warningBg, tint: colors.copper },
};

/**
 * Consumer inbox (mockup C3): provider posts awaiting the patient's approval,
 * followed by an activity list.
 */
export default function InboxScreen() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadApprovals(true).then(setApprovals).catch(() => {});
      // tolerates the endpoint not existing yet — section just stays hidden
      listMyActivity()
        .then((res) => setActivity(res.items))
        .catch(() => {});
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Text style={styles.heading}>Inbox</Text>
          <Ionicons name="notifications-outline" size={20} color={colors.textMid} />
        </View>

        {approvals.length > 0 ? (
          <>
            <Text style={styles.groupLabel}>NEEDS YOUR REVIEW</Text>
            {approvals.map((approval) => (
              <LinearGradient
                key={approval.id}
                colors={[colors.teal, colors.tealLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reviewCard}>
                {approval.session.before_image_url && approval.session.after_image_url ? (
                  <BeforeAfterSlider
                    beforeUri={approval.session.before_image_url}
                    afterUri={approval.session.after_image_url}
                    height={110}
                  />
                ) : null}
                <View style={styles.reviewBody}>
                  <Text style={styles.eyebrow}>APPROVAL REQUESTED</Text>
                  <Text style={styles.reviewTitle}>
                    {approval.practice.name} wants to publish your before & after
                  </Text>
                  <Text style={styles.reviewText}>
                    Your provider created a post from your{' '}
                    {approval.session.treatment.toLowerCase()} session. Review how it looks and
                    set your privacy level before it goes live.
                  </Text>
                  <Pressable
                    onPress={() => router.push(`/approval/${approval.id}` as Href)}
                    style={styles.reviewGo}>
                    <Text style={styles.reviewGoText}>Review & respond</Text>
                    <Ionicons name="arrow-forward" size={13} color={colors.teal} />
                  </Pressable>
                </View>
              </LinearGradient>
            ))}
          </>
        ) : (
          <Text style={styles.emptyReview}>
            No approvals waiting — when a clinic asks to publish your before & after, it
            lands here.
          </Text>
        )}

        {activity.length > 0 ? (
          <>
            <Text style={styles.groupLabel}>EARLIER</Text>
            {activity.map((item) => {
              const icon = ACTIVITY_ICONS[item.kind] ?? ACTIVITY_ICONS.case_published;
              const body = (
                <>
                  <View style={[styles.actIcon, { backgroundColor: icon.bg }]}>
                    <Ionicons name={icon.name as never} size={17} color={icon.tint} />
                  </View>
                  <View style={styles.actText}>
                    <Text style={styles.actLine}>{item.text}</Text>
                    <Text style={styles.actTime}>{formatCompactDate(item.timestamp)}</Text>
                  </View>
                </>
              );
              return item.session_id ? (
                <Pressable
                  key={item.id}
                  style={styles.actItem}
                  onPress={() => router.push(`/case/${item.session_id}` as Href)}>
                  {body}
                </Pressable>
              ) : (
                <View key={item.id} style={styles.actItem}>
                  {body}
                </View>
              );
            })}
          </>
        ) : null}
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
    paddingBottom: 12,
  },
  heading: { fontFamily: fonts.display.medium, fontSize: 24, color: '#23201c' },
  groupLabel: {
    ...typography.label,
    color: colors.textLight,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 8,
  },
  reviewCard: {
    marginHorizontal: spacing.md,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  reviewBody: { padding: 15, paddingTop: 13 },
  eyebrow: {
    fontFamily: fonts.body.semibold,
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.85)',
  },
  reviewTitle: {
    fontFamily: fonts.display.medium,
    fontSize: 19,
    lineHeight: 23,
    color: colors.white,
    marginTop: 5,
  },
  reviewText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    lineHeight: 16.5,
    color: 'rgba(255,255,255,0.86)',
    marginTop: 7,
  },
  reviewGo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginTop: 12,
  },
  reviewGoText: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: colors.teal },
  actItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  actIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actText: { flex: 1 },
  actLine: { fontFamily: fonts.body.regular, fontSize: 12, lineHeight: 17, color: colors.text },
  actTime: { ...typography.bodyXs, color: colors.textLight, marginTop: 2 },
  emptyReview: {
    ...typography.bodySm,
    color: colors.textMid,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 20,
    lineHeight: 20,
  },
});
