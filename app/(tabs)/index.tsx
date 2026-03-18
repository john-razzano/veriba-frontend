import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarBadge, GradientButton, ScreenScroll, SectionCard, StatCard, StatusPill } from '@/src/components/ui';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { formatCompactDate, formatNumber } from '@/src/utils/format';
import { useProveStore } from '@/src/store/prove-store';

export default function HomeScreen() {
  const router = useRouter();
  const practice = useProveStore((state) => state.practice);
  const sessions = useProveStore((state) => state.sessions);
  const startWizard = useProveStore((state) => state.startWizard);

  const publishedCount = sessions.filter((session) => session.status === 'published').length;
  const totalViews = sessions.reduce((sum, session) => sum + session.pageViews, 0);
  const impressions = totalViews * 5 + publishedCount * 40;

  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good afternoon</Text>
        <Text style={styles.subheading}>
          {practice.name} · {practice.location}
        </Text>
      </View>

      <View style={styles.statRow}>
        <StatCard value={String(publishedCount)} label="Published" trend="+12 this month" />
        <StatCard value={formatNumber(totalViews)} label="Profile Views" trend="+64 this week" />
        <StatCard value={formatNumber(impressions)} label="Impressions" trend="+340 this week" />
      </View>

      <GradientButton
        label="+ New Photo Session"
        onPress={() => {
          startWizard();
          router.push('/wizard/treatment');
        }}
      />

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>All Sessions</Text>
        <Text style={styles.sectionCount}>{sessions.length} total</Text>
      </View>

      <SectionCard style={styles.sessionList}>
        {sessions.map((session, index) => (
          <Pressable
            key={session.id}
            onPress={() => router.push(`/session/${session.id}`)}
            style={[styles.sessionRow, index < sessions.length - 1 && styles.sessionRowBorder]}>
            <View style={styles.sessionLeft}>
              <AvatarBadge initials={session.patientInitials} />
              <View style={styles.sessionMeta}>
                <Text style={styles.sessionTitle}>{session.treatment}</Text>
                <Text style={styles.sessionSubtitle}>{formatCompactDate(session.publishedAt ?? session.capturedAt)}</Text>
              </View>
            </View>
            <View style={styles.sessionRight}>
              <StatusPill status={session.status} />
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </View>
          </Pressable>
        ))}
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
});
