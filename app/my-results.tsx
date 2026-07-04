import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaseTile } from '@/src/components/case-tile';
import { listMyResults, type MyResultCard } from '@/src/lib/veriba-api';
import { colors, fonts, spacing, typography } from '@/src/theme';

const STATUS_LABELS: Record<string, string> = {
  published: 'Live in discovery',
  ready_to_publish: 'Approved · awaiting clinic publish',
  pending_consent: 'Waiting on your approval',
  pending_after: 'Waiting on after photo',
  declined: 'Kept private',
  unpublished: 'Removed from discovery',
  draft: 'In progress at the clinic',
};

/** The member's own before & afters — published or not (mockup C5 menu item). */
export default function MyResultsScreen() {
  const router = useRouter();
  const [results, setResults] = useState<MyResultCard[] | null>(null);

  useEffect(() => {
    listMyResults()
      .then((res) => setResults(res.sessions))
      .catch(() => setResults([]));
  }, []);

  const rows: MyResultCard[][] = [];
  for (let i = 0; i < (results ?? []).length; i += 2) {
    rows.push((results ?? []).slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headRow}>
        <Pressable style={styles.backCircle} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.heading}>My before & afters</Text>
        <View style={styles.backCircle} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {results === null ? null : results.length === 0 ? (
          <Text style={styles.empty}>
            Nothing here yet — when a clinic documents your treatment with Veriba, your
            results appear here, published or not.
          </Text>
        ) : (
          rows.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((r) => {
                const image = r.after_image_url ?? r.before_image_url;
                return (
                  <View key={r.id} style={styles.cell}>
                    {image ? (
                      <View style={styles.tileWrap}>
                        <CaseTile
                          afterUri={image}
                          treatment={r.treatment}
                          clinic={r.practice.name}
                          onPress={
                            r.status === 'published'
                              ? () => router.push(`/case/${r.id}` as Href)
                              : undefined
                          }
                        />
                      </View>
                    ) : (
                      <View style={[styles.tileWrap, styles.tileEmpty]}>
                        <Ionicons name="image-outline" size={22} color={colors.textLight} />
                      </View>
                    )}
                    <Text style={styles.status}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))
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
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cell: { flex: 1 },
  tileWrap: { height: 150, borderRadius: 10, overflow: 'hidden' },
  tileEmpty: {
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    ...typography.bodyXs,
    color: colors.textMid,
    marginTop: 5,
  },
  empty: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    lineHeight: 20,
  },
});
