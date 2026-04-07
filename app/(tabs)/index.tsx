import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ScreenScroll,
  SectionCard,
  StatCard,
  StatusPill,
} from '@/src/components/ui';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { formatCompactDate, formatNumber } from '@/src/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const practice = useProveStore((state) => state.practice);
  const practiceStats = useProveStore((state) => state.practiceStats);
  const sessions = useProveStore((state) => state.sessions);
  const bootstrap = useProveStore((state) => state.bootstrap);
  const isBootstrapping = useProveStore((state) => state.isBootstrapping);

  useEffect(() => {
    if (!practice) {
      void bootstrap().catch(() => {});
    }
  }, [bootstrap, practice]);

  const publishedCount =
    practiceStats?.totalPublished ??
    sessions.filter((session) => session.status === 'published').length;
  const pendingCount =
    practiceStats?.totalPending ??
    sessions.filter((session) =>
      ['draft', 'pending_after', 'pending_consent', 'ready_to_publish'].includes(session.status)
    ).length;
  const totalViews =
    practiceStats?.profileViewsTotal ?? sessions.reduce((sum, session) => sum + session.pageViews, 0);

  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good afternoon</Text>
        <Text style={styles.subheading}>
          {practice ? `${practice.name} · ${practice.location}` : 'Loading practice details…'}
        </Text>
      </View>

      <View style={styles.statRow}>
        <StatCard value={String(publishedCount)} label="Published" trend="Live on site" />
        <StatCard value={String(pendingCount)} label="Pending" trend="Needs follow-through" />
        <StatCard value={formatNumber(totalViews)} label="Profile Views" trend="All time" />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>All Sessions</Text>
        <Text style={styles.sectionCount}>
          {isBootstrapping ? 'Refreshing…' : `${sessions.length} total`}
        </Text>
      </View>

      <SectionCard style={styles.sessionList}>
        {sessions.length > 0 ? (
          sessions.map((session, index) => (
            <Pressable
              key={session.id}
              onPress={() => router.push(`/session/${session.id}`)}
              style={[styles.sessionRow, index < sessions.length - 1 && styles.sessionRowBorder]}>
              <View style={styles.sessionLeft}>
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarText}>{session.patientInitials}</Text>
                </View>
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionTitle}>{session.treatment}</Text>
                  <Text style={styles.sessionSubtitle}>
                    {formatCompactDate(session.publishedAt ?? session.capturedAt)} · {session.photos.length}{' '}
                    {session.photos.length === 1 ? 'photo' : 'photos'}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionRight}>
                <StatusPill status={session.status} />
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>
              Create your first before-and-after entry to start populating the practice gallery.
            </Text>
          </View>
        )}
      </SectionCard>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  greeting: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subheading: {
    ...typography.bodySm,
    color: colors.textLight,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textLight,
  },
  sectionCount: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  sessionList: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatarBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarText: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.copper,
  },
  sessionMeta: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
  },
  sessionSubtitle: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyState: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.text,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.textLight,
  },
});
