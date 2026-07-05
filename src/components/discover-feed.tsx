import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MosaicFeed } from '@/src/components/mosaic-feed';
import { type FeedCase } from '@/src/data/mock-feed';
import { hasMoreFeedCases, loadFeedCases, loadMoreFeedCases } from '@/src/lib/gallery';
import { colors, fonts, spacing, typography } from '@/src/theme';

const ALL = 'For you';

/**
 * Consumer discovery feed (mockup C1) — the member "Home" tab. Edge-to-edge
 * mosaic of verified before/afters from the public gallery API.
 */
export function DiscoverFeed() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState(ALL);
  const [cases, setCases] = useState<FeedCase[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback((force = false) => {
    setFailed(false);
    loadFeedCases(force)
      .then(setCases)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setCases(await loadFeedCases(true));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const onLoadMore = useCallback(() => {
    if (loadingMore || !hasMoreFeedCases()) return;
    setLoadingMore(true);
    loadMoreFeedCases()
      .then((all) => {
        if (all) setCases([...all]);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loadingMore]);

  // chips reflect the categories actually present in the live feed
  const filters = useMemo(() => {
    const categories = [...new Set((cases ?? []).map((c) => c.category).filter(Boolean))];
    return [ALL, ...(categories as string[])];
  }, [cases]);

  const shownCases = useMemo(
    () =>
      activeFilter === ALL
        ? (cases ?? [])
        : (cases ?? []).filter((c) => c.category === activeFilter),
    [cases, activeFilter]
  );

  const openCase = (c: FeedCase) => router.push(`/case/${c.id}` as Href);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header scrolls away with content (IG-style); the filter row stays pinned. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={250}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 900) {
            onLoadMore();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.copper}
          />
        }>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.wordmark}>Veriba</Text>
            <Text style={styles.explore}>EXPLORE</Text>
          </View>
        </View>

        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}>
            {filters.map((f) => {
              const on = f === activeFilter;
              return (
                <Pressable
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{f}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        {failed ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateText}>Couldn't load the feed.</Text>
            <Pressable onPress={() => load()} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : cases === null ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.copper} />
          </View>
        ) : shownCases.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateText}>No cases in this category yet.</Text>
          </View>
        ) : (
          <MosaicFeed cases={shownCases} onPressCase={openCase} />
        )}
        {loadingMore ? (
          <View style={styles.moreWrap}>
            <ActivityIndicator color={colors.copper} />
          </View>
        ) : null}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: 4,
  },
  brand: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  wordmark: { fontFamily: fonts.display.semibold, fontSize: 26, color: '#23201c', letterSpacing: 0.5 },
  explore: {
    fontFamily: fonts.body.semibold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.textLight,
    marginBottom: 4,
  },
  filterBar: {
    backgroundColor: colors.bg,
  },
  filterContent: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.textMid },
  chipTextOn: { color: colors.white },
  stateWrap: { paddingTop: 80, alignItems: 'center', gap: spacing.md },
  moreWrap: { paddingVertical: spacing.lg, alignItems: 'center' },
  stateText: { ...typography.bodySm, color: colors.textMid },
  retry: {
    borderWidth: 1,
    borderColor: colors.copper,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  retryText: { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.copper },
});
