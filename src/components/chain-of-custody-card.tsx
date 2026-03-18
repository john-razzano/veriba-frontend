import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { buildChainOfCustody } from '@/src/data/mockData';
import { colors, fonts, gradients, radii, shadows, spacing, typography } from '@/src/theme';
import { formatTimestamp } from '@/src/utils/format';
import type { Session } from '@/src/types';

export function ChainOfCustodyCard({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const chain = buildChainOfCustody(session);

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={gradients.primary} style={styles.badgeCircle}>
            <Ionicons name="shield-checkmark" size={15} color={colors.white} />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Chain of Custody</Text>
            <Text style={styles.headerSubtitle}>
              {chain.allVerified
                ? `All ${chain.checkpoints.length} checkpoints verified`
                : 'Verification still in progress'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textLight}
        />
      </Pressable>
      {open ? (
        <View style={styles.timeline}>
          {chain.checkpoints.map((checkpoint, index) => (
            <View key={checkpoint.id} style={styles.stepRow}>
              <View style={styles.iconColumn}>
                <View style={styles.iconDot}>
                  <Text>{checkpoint.icon}</Text>
                </View>
                {index < chain.checkpoints.length - 1 ? <View style={styles.connector} /> : null}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{checkpoint.label}</Text>
                <Text style={styles.stepDetail}>{checkpoint.detail}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.timestamp}>{formatTimestamp(checkpoint.timestamp)}</Text>
                  {checkpoint.hash ? (
                    <Text style={styles.hashText}>{checkpoint.hash}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  badgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.success,
    marginTop: 2,
  },
  timeline: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconColumn: {
    width: 28,
    alignItems: 'center',
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(181,103,45,0.16)',
    marginTop: 4,
    borderRadius: 999,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  stepTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.text,
  },
  stepDetail: {
    ...typography.bodyXs,
    color: colors.textLight,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 6,
  },
  timestamp: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: colors.textLight,
  },
  hashText: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.teal,
    backgroundColor: colors.bgInput,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});
