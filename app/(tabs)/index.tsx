import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscoverFeed } from '@/src/components/discover-feed';
import { StatCard, StatusPill } from '@/src/components/ui';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';
import type { Session } from '@/src/types';

export default function HomeScreen() {
  const role = useProveStore((state) => state.user?.role);

  // Members land on the cross-clinic discovery feed; providers keep the dashboard.
  if (role === 'member') {
    return <DiscoverFeed />;
  }

  return <ProviderDashboard />;
}

function ProviderDashboard() {
  const router = useRouter();
  const practice = useProveStore((state) => state.practice);
  const practiceStats = useProveStore((state) => state.practiceStats);
  const sessions = useProveStore((state) => state.sessions);
  const bootstrap = useProveStore((state) => state.bootstrap);
  const refreshSessions = useProveStore((state) => state.refreshSessions);
  const refreshPracticeStats = useProveStore((state) => state.refreshPracticeStats);
  const isBootstrapping = useProveStore((state) => state.isBootstrapping);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!practice) {
      void bootstrap().catch(() => {});
    }
  }, [bootstrap, practice]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshSessions(), refreshPracticeStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshSessions, refreshPracticeStats]);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.staticTop}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good afternoon</Text>
          <Text style={styles.subheading}>
            {practice ? `${practice.name} · ${practice.location}` : 'Loading practice details…'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <StatCard value={String(publishedCount)} label="Published" trend="Live on site" />
          <StatCard value={String(pendingCount)} label="Pending" trend="Needs follow-through" />
          <StatCard
            value={formatNumber(totalViews)}
            label="Profile Views"
            trend={
              practice?.followersCount
                ? `${formatNumber(practice.followersCount)} followers`
                : 'All time'
            }
          />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>RECENT CASES</Text>
          <Text style={styles.sectionCount}>
            {isBootstrapping ? 'Refreshing…' : `${sessions.length} total`}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.copper}
          />
        }>
        {sessions.length > 0 ? (
          <View style={styles.grid}>
            {Array.from({ length: Math.ceil(sessions.length / 3) }, (_, row) => (
              <View key={row} style={styles.gridRow}>
                {sessions.slice(row * 3, row * 3 + 3).map((session) => (
                  <ProviderTile
                    key={session.id}
                    session={session}
                    onPress={() => router.push(`/session/${session.id}`)}
                  />
                ))}
                {sessions.slice(row * 3, row * 3 + 3).length < 3
                  ? Array.from(
                      { length: 3 - sessions.slice(row * 3, row * 3 + 3).length },
                      (_, i) => <View key={`pad-${i}`} style={styles.tilePad} />
                    )
                  : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No cases yet</Text>
            <Text style={styles.emptyText}>
              Capture your first before & after with the ＋ button to start your gallery.
            </Text>
          </View>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Dashboard mosaic tile (mockup P1): after-forward image + status pill. */
function ProviderTile({ session, onPress }: { session: Session; onPress: () => void }) {
  const image = session.afterPhotoUri ?? session.beforePhotoUri;
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={styles.tileEmpty}>
          <Ionicons name="image-outline" size={20} color={colors.textLight} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(18,12,7,0.14)', 'rgba(18,12,7,0.8)']}
        locations={[0.42, 0.66, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.tileStatus}>
        <StatusPill status={session.status} />
      </View>
      <View style={styles.tileLab}>
        <Text style={styles.tileTreatment} numberOfLines={1}>
          {session.treatment}
        </Text>
        <Text style={styles.tileInitials}>{session.patientInitials}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  staticTop: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.md,
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
  scroll: {
    flex: 1,
  },
  grid: { paddingHorizontal: 2 },
  gridRow: { flexDirection: 'row', gap: 2, height: 124, marginBottom: 2 },
  tile: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.bgInput,
  },
  tilePad: { flex: 1 },
  tileEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileStatus: {
    position: 'absolute',
    top: 6,
    left: 6,
    transform: [{ scale: 0.85 }],
    transformOrigin: 'top left',
  },
  tileLab: { position: 'absolute', left: 7, right: 7, bottom: 6 },
  tileTreatment: {
    fontFamily: fonts.display.medium,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tileInitials: {
    fontFamily: fonts.body.semibold,
    fontSize: 7.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
