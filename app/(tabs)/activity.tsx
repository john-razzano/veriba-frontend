import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarBadge, StatusPill } from '@/src/components/ui';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { formatCompactDate } from '@/src/utils/format';
import type { Session } from '@/src/types';

/**
 * Provider Activity (mockup P2): the practice's sessions grouped by approval
 * state, so nothing waiting on a patient or ready to go gets lost.
 */
export default function ActivityScreen() {
  const router = useRouter();
  const sessions = useProveStore((state) => state.sessions);
  const refreshSessions = useProveStore((state) => state.refreshSessions);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshSessions().catch(() => {});
    }, [refreshSessions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSessions();
    } finally {
      setRefreshing(false);
    }
  }, [refreshSessions]);

  const waiting = sessions.filter((s) =>
    ['pending_after', 'pending_consent'].includes(s.status)
  );
  const ready = sessions.filter((s) => s.status === 'ready_to_publish');
  const live = sessions.filter((s) => s.status === 'published');
  const rest = sessions.filter((s) =>
    ['draft', 'declined', 'unpublished'].includes(s.status)
  );

  const subtitleFor = (s: Session): string => {
    if (s.status === 'pending_after') return 'Waiting on after photo';
    if (s.status === 'pending_consent') {
      const f = s.followUpRequest;
      return f?.sentAt
        ? `Approval sent ${formatCompactDate(f.sentAt)}${f.openedAt ? ' · opened' : ''}`
        : 'Approval not sent yet';
    }
    if (s.status === 'ready_to_publish') {
      if (s.consentTier === 'full_blur') return 'Needs obscuration before publish';
      return `Approved · consent: ${s.consentTier ?? '—'}`;
    }
    if (s.status === 'published') {
      return `Live${s.publishedAt ? ` since ${formatCompactDate(s.publishedAt)}` : ''} · ${s.pageViews} views`;
    }
    if (s.status === 'declined') return 'Patient declined · private';
    if (s.status === 'unpublished') return 'Removed from discovery';
    return 'Draft';
  };

  const Group = ({ title, items }: { title: string; items: Session[] }) =>
    items.length === 0 ? null : (
      <>
        <Text style={styles.groupHd}>
          {title} · {items.length}
        </Text>
        {items.map((s) => (
          <Pressable
            key={s.id}
            style={styles.row}
            onPress={() => router.push(`/session/${s.id}`)}>
            <AvatarBadge initials={s.patientInitials} size={38} />
            <View style={styles.meta}>
              <Text style={styles.title} numberOfLines={1}>
                {s.treatment} · {s.patientInitials}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {subtitleFor(s)}
              </Text>
            </View>
            <StatusPill status={s.status} />
          </Pressable>
        ))}
      </>
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.heading}>Activity</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.copper}
          />
        }>
        {sessions.length === 0 ? (
          <Text style={styles.empty}>
            No cases yet — capture your first before & after with the ＋ button.
          </Text>
        ) : (
          <>
            <Group title="WAITING ON PATIENT" items={waiting} />
            <Group title="APPROVED · READY TO PUBLISH" items={ready} />
            <Group title="LIVE" items={live} />
            <Group title="DRAFTS & PRIVATE" items={rest} />
          </>
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
    paddingBottom: 10,
  },
  groupHd: {
    ...typography.label,
    color: colors.textMid,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  meta: { flex: 1 },
  title: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: colors.text },
  sub: { ...typography.bodyXs, color: colors.textLight, marginTop: 1 },
  empty: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    lineHeight: 20,
  },
});
